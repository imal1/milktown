# Milktown — 停工现状快照

写于 2026-09-03，基于阅读 `cd3c69c` 的实际源码，而非 README 的描述。
最后一次提交是 2025-08-04，此后无改动。

这份文档记录的是**代码实际做了什么**，用来对抗 README 里已经不成立的完成度声明。

## 一句话状态

一个能跑起来、能打字、但**存不了盘**的 Markdown 编辑器骨架。桌面壳是 Tauri，编辑器是 Milkdown，两者之间没有接通。

## 技术栈实况

| 层 | 实际情况 |
| --- | --- |
| 桌面壳 | Tauri 2，窗口 800×600，`csp: null` |
| 前端 | React 18 + TypeScript + Vite 6 |
| 编辑器 | Milkdown Kit 裸装（`commonmark` + `gfm` + `history` + `cursor` + `clipboard` + `indent` + `upload`），主题 `@milkdown/theme-nord` |
| 包管理 | bun（`bun.lock`） |

`@milkdown/crepe` 已在 `package.json` 里，但代码里一次都没用到 —— 装了没接。

## 源码规模

```
src/App.tsx              139 行
src/components/Editor.tsx 106 行
src/components/Toolbar.tsx 207 行
src-tauri/src/lib.rs      16 行（只有脚手架自带的 greet 命令）
```

除此之外没有业务代码。没有测试，没有 CI。

## 五个必须先知道的事实

### 1. 编辑器的内容变化从未传回 React（致命）

`Editor.tsx` 接收了 `onChange` prop，但从头到尾没有注册任何 Milkdown listener 去调用它。用户在编辑器里打的字，React 侧的 `content` state 完全不知道。

连锁后果：

- `isDirty` 永远不会因为打字变成 `true`
- 「保存」保存的是 `App.tsx` 里那个初始字符串，不是用户实际编辑的内容

修复方向：接 `@milkdown/kit/plugin/listener` 的 `listenerCtx`，在 `markdownUpdated` 里调 `onChange`。

### 2. 内容同步方向也是错的

`Editor.tsx` 里 `useEffect` 通过 `ctx.set(defaultValueCtx, content)` 来「更新编辑器内容」。`defaultValueCtx` 只在编辑器创建时读取一次，改它对已挂载的文档没有任何作用。

同时 `useEditor` 的依赖数组是 `[content, onChange, onSave]` —— 一旦 `content` 变化就会整个重建编辑器，光标和 undo 历史全丢。

这两处合起来说明：**文档状态到底谁是唯一真相源，当初没想清楚。** 这是下一轮设计要先钉死的问题。

### 3. 文件操作是浏览器 API，不是 Tauri

`Toolbar.tsx` 里的注释写着「模拟文件操作（在依赖安装完成前）」，实现是：

- 打开 = 造一个隐藏的 `<input type="file">`，用 `FileReader` 读
- 保存 = 造 `Blob` + `<a download>` 触发浏览器下载
- 另存为 = `prompt()` 问文件名，然后同上

所以在桌面应用里点「保存」，行为是弹出一个下载。`currentFile` 只存了文件**名字符串**，没有路径 —— 无法回写原文件。

README 里「文件操作 ✅ 已完成」这一条是不成立的。

### 4. Tauri 侧的管道铺好了，前端却调不到

后端已经就绪：

- `src-tauri/Cargo.toml` 有 `tauri-plugin-fs` 和 `tauri-plugin-dialog`
- `lib.rs` 已 `.plugin(tauri_plugin_fs::init())` 和 `.plugin(tauri_plugin_dialog::init())`
- `capabilities/default.json` 已授予 `fs:default` 和 `dialog:default`

缺的只有前端绑定：`package.json` 里只有 `@tauri-apps/plugin-opener`，**没有 `@tauri-apps/plugin-fs` 和 `@tauri-apps/plugin-dialog`**。

这就是「依赖安装完成前」当初卡住的地方，也是解锁真实文件读写最短的一步。

### 5. App.tsx 用 DOM 穿刺来触发保存

```ts
const saveButton = document.querySelector('.toolbar-button.primary') as HTMLButtonElement;
saveButton?.click();
```

`App` 靠查询 CSS 类去点 `Toolbar` 的按钮。改一个 class 名就会静默失效。同时 `Editor` 和 `Toolbar` 各自注册了一份 `Ctrl+S` 全局监听器，两处竞争。

## README 里不成立的声明

以下功能 README 声称已有，代码里没有：

- 编辑 / 预览双模式切换、`Ctrl+P`
- 语法高亮
- 格式化工具栏（粗体、斜体、代码、链接按钮）—— 工具栏上只有新建/打开/保存/另存为四个按钮
- 「自动保存」

## 其他遗留

- `App.tsx` 的初始文档是一大段「测试滚动功能」的占位内容，含大量重复段落，需要替换
- 仓库里有 `.DS_Store`（根目录、`src/`、`src-tauri/`），`test.html` 用途不明
- 只有两次提交，无分支、无 issue、无 PR

## 停工时的待办（README「开发计划」未完成项）

- [ ] 更多 Markdown 扩展语法
- [ ] 主题切换
- [ ] 设置界面
- [ ] 拖拽文件打开
- [ ] 最近文件列表
- [ ] 搜索和替换
- [ ] 字数统计

这些是当时的想法，未经过本轮设计验证，仅作为线索保留。
