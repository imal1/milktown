# Milktown

一个所见即所得的本地 Markdown 编辑器，桌面应用，单文档模型。为作者本人日常写作而做，不为发布而做。

窗口里只有两样东西：一条 34px 的标题栏，和一张纸。**写作面上没有工具栏**——18 条排版命令全在系统菜单栏的「格式」与「段落」两栏里，每一条带快捷键（ADR 0013）。没有文件树，没有标签页。

光标移到哪一段，那一段的 Markdown 标记（`##`、`**`、`` ` ``）就显出来，可以直接改；移开又收回去（ADR 0014）。

保存时自动留存版本，随时能翻回三小时前看改了什么——这是自动时间机器，不是 git，你不写提交信息（ADR 0004）。

## 快捷键

| 功能 | macOS | Windows/Linux |
| --- | --- | --- |
| 新建文档 | `⌘N` | `Ctrl+N` |
| 最近文件面板 | `⌘O` | `Ctrl+O` |
| 打开文件对话框 | `⇧⌘O` | `Ctrl+Shift+O` |
| 保存 | `⌘S` | `Ctrl+S` |
| 另存为 | `⇧⌘S` | `Ctrl+Shift+S` |
| 源码模式进 / 出 | `⌘/` | `Ctrl+/` |
| 原文对照（排版与原文并排） | `⌥⌘/` | `Ctrl+Alt+/` |
| 磁盘对照（磁盘那份与当前这份） | `⇧⌘/` | `Ctrl+Shift+/` |
| 版本对照（历史里某一版与当前这份） | `⇧⌘H` | `Ctrl+Shift+H` |
| 查找与替换 | `⌘F` | `Ctrl+F` |
| 关闭窗口 / 退出 | `⌘W` `⌘Q` | `Ctrl+W` `Ctrl+Q` |

排版命令（加粗 `⌘B`、标题 `⌘1`–`⌘6`、引用 `⌥⌘Q`、列表 `⌥⌘U` / `⌥⌘O` 等 18 条）只在菜单栏里，写作面上不给按钮。空文档的纸上有张便条列着最常用的几条，打第一个字就走。

源码模式下改的是 Markdown 原文，此时的 `⌘S` 写出的就是你敲的那些字符，不经过规范化（ADR 0009）。

查找条是文本区的东西：在写作视图按 `⌘F` 会先切进源码模式再打开它（ADR 0013 的「工具栏的边界」，另见 #26）。查找条的 `Esc` 只关查找条，不动文档。

三个双页视图（原文对照、磁盘对照、版本对照）形态相同：并排两栏、接管整个窗口、只读、`Esc` 退出，进去之前真相源先交回编辑器（ADR 0015）。菜单里这三项与源码模式构成一个互斥组，至多一项打钩。版本对照里 `↑` `↓` 选版本，`⏎` 把选中版本装回编辑器（不写盘，`⌘S` 才落盘）；磁盘对照里 `↑` `↓` 在改动之间跳。

有未保存修改时关窗、新建、打开、还原都会先问一句：`⏎` 保存 · `⌘D` 不保存 · `Esc` 取消。

## 开发环境设置

### 前提条件

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/) 最新稳定版

### 常用命令

```bash
bun install          # 安装依赖
bun run tauri dev    # 开发模式（起 Vite + Tauri 窗口）
bun run test         # 跑测试
bun run typecheck    # 类型检查（tsc --noEmit，只覆盖 .ts）
bun run tauri build  # 打包
```

## 项目结构

```
milktown/
├── src/                     # Vue 3 前端源码
│   ├── App.vue              # 只剩模板与接线
│   ├── workspace/           # 状态与流程（workspace）、按键映射（keymap）、
│   │                        #   草稿、拖拽、字数口径、起手提示
│   ├── components/          # 标题栏、最近文件面板、双页视图、确认层、源码视图
│   ├── editor/              # Crepe 封装、排版命令清单、源码标记、规范化模块
│   ├── windows/             # 多窗口
│   ├── files/               # 文件读写与对话框（端口注入）
│   ├── history/             # 版本存储与行级差异
│   ├── recent/              # 最近文件
│   ├── main.ts              # 入口
│   └── styles.css           # 排版与主题
├── src-tauri/               # Tauri 后端
│   ├── src/                 # Rust 源码
│   ├── capabilities/        # 文件系统与对话框权限
│   └── tauri.conf.json      # Tauri 配置（原生窗口 + 覆盖式标题栏）
├── docs/adr/                # 架构决策记录
├── CONTEXT.md               # 领域词汇表
└── package.json
```

## 技术栈

- **前端**：Vue 3 + TypeScript 7 + Vite 8
- **编辑器**：Milkdown Crepe（两条工具栏关闭，跟着内容走的五个控件保留，ADR 0013）
- **后端**：Tauri 2 + Rust
- **测试**：Vitest（纯逻辑跑 node 环境，规范化跑 jsdom）

## 设计约束

读代码之前值得先读的五份文件：

- `CONTEXT.md` —— 领域词汇表，「文档 / 文件 / 当前文件 / 脏 / 版本 / 规范化」等术语在这里钉死。
- `docs/adr/0002-editor-owns-the-document.md` —— 编辑器是文档的唯一真相源，Vue 侧不存内容副本。
- `docs/adr/0005-versions-live-next-to-the-file.md` —— 版本存在文件旁边的 `.milktown/` 里。
- `docs/adr/0006-source-level-diff-and-canonical-markdown.md` —— 差异是源码级的，序列化风格被钉死。
- `docs/adr/0009-source-mode-hands-over-the-truth.md` —— 源码模式是真相源的一次交接，不是第二个真相源。
- `docs/adr/0013-no-toolbar-on-the-writing-surface.md` —— 写作面上没有工具栏，以及什么不算工具栏。
- `docs/adr/0015-every-double-page-view-hands-the-truth-back-first.md` —— 三个双页视图共用一条真相源规矩。

## 开发计划

- [x] Vue + Crepe 骨架与测试框架
- [x] 打开文件、保存与另存为
- [x] 34px 标题栏与无边框窗口
- [x] 最近文件
- [x] 规范化模块与版本存储
- [x] 双页视图与版本还原
- [x] 源码模式与查找替换（ADR 0009）
- [x] 未保存内容的草稿留存（ADR 0010）
- [x] 多窗口、文件关联与拖拽打开（ADR 0011）
- [x] 系统菜单栏入口（格式、段落、视图、窗口）
- [x] 写作面去工具栏，光标行显源码标记（ADR 0013、0014）
- [x] 原文对照与磁盘对照（ADR 0015）
- [ ] 深色模式（Crepe 的 frame-dark + 另一套 CSS 变量）
- [ ] 本地相对路径图片（Tauri asset protocol）
- [ ] 外部修改检测：文件在打开之后被别的程序改过时，⌘S 现在直接覆盖
- [ ] 排版面上的查找（#26）
- [ ] 目录级版本与真 git（ADR 0004 的第二阶段）

## 许可证

本项目基于 MIT 许可证开源。

## 致谢

- [Tauri](https://tauri.app/) - 现代桌面应用框架
- [Milkdown](https://milkdown.dev/) - Markdown 编辑器框架
- [Typora](https://typora.io/) - 设计灵感来源
