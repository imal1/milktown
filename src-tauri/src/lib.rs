use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, RunEvent, State, WebviewUrl, WebviewWindowBuilder, Window, WindowEvent};

/// 新窗口开出来之前就定好它要装什么（ADR 0011）。
#[derive(Clone)]
enum Assigned {
    Path(String),
    Draft(String),
}

/// 一个窗口一个文档。这份注册表回答「这个文件是不是已经在别的窗口开着」。
#[derive(Default)]
struct Windows {
    /// 窗口标签 -> 它当前装着的文件路径。网页用 `claim` 维护。
    paths: Mutex<HashMap<String, String>>,
    /// 已经开出来、还没被它的网页领走的任务。
    assignments: Mutex<HashMap<String, Assigned>>,
    /// 启动参数带进来、还没被任何窗口领走的路径。
    pending: Mutex<Vec<String>>,
    /// 新窗口标签的流水号。只增不减，避免和已关掉的窗口重名。
    next: Mutex<u32>,
    /// 第一个窗口的网页是否已经问过启动参数。
    booted: AtomicBool,
}

/// 网页启动时问的那一次：这个窗口装什么，以及启动参数带进来了什么。
#[derive(Default, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct Boot {
    path: Option<String>,
    draft: Option<String>,
    /// 只有最先启动的那个窗口拿得到，之后就空了。
    startup_paths: Vec<String>,
}

#[tauri::command]
fn boot(window: Window, state: State<'_, Windows>) -> Boot {
    match state.assignments.lock().unwrap().remove(window.label()) {
        Some(Assigned::Path(path)) => Boot {
            path: Some(path),
            ..Boot::default()
        },
        Some(Assigned::Draft(draft)) => Boot {
            draft: Some(draft),
            ..Boot::default()
        },
        None => {
            // 锁着 pending 再置位，否则 deliver 可能把路径塞进已经取走的那份里。
            let mut pending = state.pending.lock().unwrap();
            state.booted.store(true, Ordering::SeqCst);
            Boot {
                startup_paths: std::mem::take(&mut *pending),
                ..Boot::default()
            }
        }
    }
}

#[tauri::command]
fn claim(window: Window, state: State<'_, Windows>, path: Option<String>) {
    let mut paths = state.paths.lock().unwrap();
    match path {
        Some(path) => paths.insert(window.label().to_string(), path),
        None => paths.remove(window.label()),
    };
}

#[tauri::command]
fn focus_path(window: Window, app: AppHandle, state: State<'_, Windows>, path: String) -> bool {
    let label = holder(&state, &path).filter(|label| label != window.label());
    match label {
        Some(label) => {
            focus(&app, &label);
            true
        }
        None => false,
    }
}

#[tauri::command]
fn open_files(app: AppHandle, paths: Vec<String>) {
    open_all(&app, paths);
}

#[tauri::command]
fn open_drafts(app: AppHandle, ids: Vec<String>) {
    for id in ids {
        spawn(&app, Assigned::Draft(id));
    }
}

fn holder(state: &Windows, path: &str) -> Option<String> {
    state
        .paths
        .lock()
        .unwrap()
        .iter()
        .find(|(_, held)| held.as_str() == path)
        .map(|(label, _)| label.clone())
}

/// 菜单事件只发给眼前那个窗口。`Manager::get_focused_window` 要 unstable feature。
fn focused(app: &AppHandle) -> Option<tauri::WebviewWindow> {
    app.webview_windows()
        .into_values()
        .find(|window| window.is_focused().unwrap_or(false))
}

/// 静默聚焦，不出提示（设计 2f）。最小化的窗口聚焦看不见，先弹出来再抖一下。
fn focus(app: &AppHandle, label: &str) {
    let Some(window) = app.get_webview_window(label) else {
        return;
    };
    if window.is_minimized().unwrap_or(false) {
        let _ = window.unminimize();
        let _ = window.request_user_attention(Some(tauri::UserAttentionType::Informational));
    }
    let _ = window.set_focus();
}

/// 每个文件各开一个新窗口；已经开着的那些只聚焦，不开第二个（ADR 0011）。
fn open_all(app: &AppHandle, paths: Vec<String>) {
    let state = app.state::<Windows>();
    for path in paths {
        match holder(&state, &path) {
            Some(label) => focus(app, &label),
            None => spawn(app, Assigned::Path(path)),
        }
    }
}

/// 新窗口沿用配置里那份窗口设置，只换标签——大小、标题栏样式都一样。
fn spawn(app: &AppHandle, assigned: Assigned) {
    let state = app.state::<Windows>();
    let label = {
        let mut next = state.next.lock().unwrap();
        *next += 1;
        format!("w{next}")
    };
    state
        .assignments
        .lock()
        .unwrap()
        .insert(label.clone(), assigned);

    let built = match app.config().app.windows.first().cloned() {
        Some(mut config) => {
            config.label = label.clone();
            WebviewWindowBuilder::from_config(app, &config).and_then(|builder| builder.build())
        }
        None => WebviewWindowBuilder::new(app, &label, WebviewUrl::default()).build(),
    };

    if built.is_err() {
        state.assignments.lock().unwrap().remove(&label);
    }
}

/// 命令行参数里的路径。相对路径按启动时的工作目录展开——网页那边只认绝对的。
fn args_of(argv: impl IntoIterator<Item = String>, cwd: &std::path::Path) -> Vec<String> {
    argv.into_iter()
        .filter(|arg| !arg.starts_with('-'))
        .map(|arg| {
            let path = std::path::Path::new(&arg);
            match path.is_absolute() {
                true => arg,
                false => cwd.join(path).to_string_lossy().into_owned(),
            }
        })
        .collect()
}

/// 从命令行、Finder 或第二次启动进来的路径。后缀由网页那边按同一份清单筛。
fn deliver(app: &AppHandle, paths: Vec<String>) {
    if paths.is_empty() {
        return;
    }

    let state = app.state::<Windows>();
    {
        let mut pending = state.pending.lock().unwrap();
        // 第一个窗口的网页还没来问过，先攒着——冷启动时 Finder 往往比网页快。
        if !state.booted.load(Ordering::SeqCst) {
            pending.extend(paths);
            return;
        }
    }
    open_all(app, paths);
}

/// 菜单栏文案见设计 2d。自定义项的 id 就是网页那边的 Intent 字符串。
#[cfg(target_os = "macos")]
fn build_menu(app: &AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    use tauri::menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu, WINDOW_SUBMENU_ID};

    Menu::with_items(
        app,
        &[
            &Submenu::with_items(
                app,
                "milktown",
                true,
                &[
                    &PredefinedMenuItem::about(
                        app,
                        Some("关于 milktown"),
                        Some(AboutMetadata::default()),
                    )?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, Some("退出 milktown"))?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "文件",
                true,
                &[
                    &MenuItem::with_id(app, "new", "新建", true, Some("CmdOrCtrl+N"))?,
                    &MenuItem::with_id(app, "open", "打开…", true, Some("Shift+CmdOrCtrl+O"))?,
                    &MenuItem::with_id(app, "recent.toggle", "最近文件", true, Some("CmdOrCtrl+O"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "save", "保存", true, Some("CmdOrCtrl+S"))?,
                    &MenuItem::with_id(app, "saveAs", "另存为…", true, Some("Shift+CmdOrCtrl+S"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::close_window(app, Some("关闭窗口"))?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "编辑",
                true,
                &[
                    // 这五项是系统预置，文案不归我们定（设计 2d）。
                    &PredefinedMenuItem::undo(app, None)?,
                    &PredefinedMenuItem::redo(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "find.open", "查找与替换…", true, Some("CmdOrCtrl+F"))?,
                ],
            )?,
            &Submenu::with_items(
                app,
                "视图",
                true,
                &[
                    // ponytail: 不带勾。源码模式是每个窗口自己的状态，菜单是全应用一份的，
                    // 勾要正确就得每个窗口各建一份菜单——菜单在这里的作用是让人发现 ⌘/ 存在。
                    &MenuItem::with_id(app, "source.toggle", "源码模式", true, Some("CmdOrCtrl+/"))?,
                    &MenuItem::with_id(app, "diff.open", "版本历史", true, Some("Shift+CmdOrCtrl+H"))?,
                ],
            )?,
            // 这个 id 让 tauri 把它注册成 NSApp 的窗口菜单，窗口列表与切换由系统填。
            &Submenu::with_id_and_items(
                app,
                WINDOW_SUBMENU_ID,
                "窗口",
                true,
                &[
                    &PredefinedMenuItem::minimize(app, Some("最小化"))?,
                    &PredefinedMenuItem::maximize(app, Some("缩放"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::close_window(app, Some("关闭窗口"))?,
                ],
            )?,
        ],
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        // 单例插件必须第一个注册。第二次启动把参数交给已运行的实例（ADR 0011）。
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            deliver(app, args_of(argv.into_iter().skip(1), std::path::Path::new(&cwd)));
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Windows::default())
        .setup(|app| {
            let cwd = std::env::current_dir().unwrap_or_default();
            let args = args_of(std::env::args().skip(1), &cwd);
            app.state::<Windows>().pending.lock().unwrap().extend(args);
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, WindowEvent::Destroyed) {
                let state = window.state::<Windows>();
                state.paths.lock().unwrap().remove(window.label());
                state.assignments.lock().unwrap().remove(window.label());
            }
        })
        .on_menu_event(|app, event| {
            // 菜单项的 id 就是 Intent，直接交给当前窗口的网页去跑。
            // 必须 emit_to：emit 是广播，会让每个窗口都执行一遍这个菜单动作。
            if let Some(window) = focused(app) {
                let _ = window.emit_to(window.label(), "milktown://intent", event.id().0.clone());
            }
        })
        .invoke_handler(tauri::generate_handler![
            boot,
            claim,
            focus_path,
            open_files,
            open_drafts
        ]);

    #[cfg(target_os = "macos")]
    let builder = builder.menu(build_menu);

    builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| match event {
            #[cfg(target_os = "macos")]
            RunEvent::Opened { urls } => {
                let paths = urls
                    .iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .map(|path| path.to_string_lossy().into_owned())
                    .collect();
                deliver(app, paths);
            }
            RunEvent::ExitRequested { api, .. } => {
                // ⌘Q 不能跳过每个窗口自己的脏文档处理（确认框 / 草稿）。让每个窗口
                // 走一遍关窗流程，最后一个关掉时这里会再来一次，那次窗口列表是空的。
                if !app.webview_windows().is_empty() {
                    api.prevent_exit();
                    let _ = app.emit("milktown://intent", "window.close");
                }
            }
            _ => {}
        });
}
