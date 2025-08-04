# Milktown

一个基于 Tauri 和 React 构建的现代 Markdown 编辑器，灵感来自 Typora。

## 功能特性

- 🎨 **实时预览**: 在编辑和预览模式之间自由切换
- 📝 **Markdown 支持**: 支持标准 Markdown 语法
- 💾 **文件操作**: 新建、打开、保存 Markdown 文件
- ⚡ **快捷键**: 丰富的键盘快捷键支持
- 🖥️ **跨平台**: 基于 Tauri 的桌面应用
- 🎯 **轻量级**: 快速启动，低内存占用

## 快捷键

| 功能 | Windows/Linux | macOS |
|------|---------------|-------|
| 新建文档 | `Ctrl+N` | `Cmd+N` |
| 打开文档 | `Ctrl+O` | `Cmd+O` |
| 保存文档 | `Ctrl+S` | `Cmd+S` |
| 另存为 | `Ctrl+Shift+S` | `Cmd+Shift+S` |
| 切换预览 | `Ctrl+P` | `Cmd+P` |

## 开发环境设置

### 前提条件

- [Node.js](https://nodejs.org/) (版本 16+)
- [Rust](https://rustlang.org/) (最新稳定版)
- [Bun](https://bun.sh/) (可选，推荐)

### 安装依赖

```bash
# 使用 bun (推荐)
bun install

# 或使用 npm
npm install
```

### 开发模式

```bash
# 启动开发服务器
bun run tauri dev

# 或使用 npm
npm run tauri dev
```

### 构建应用

```bash
# 构建生产版本
bun run tauri build

# 或使用 npm
npm run tauri build
```

## 项目结构

```
milktown/
├── src/                     # React 前端源码
│   ├── components/          # React 组件
│   │   ├── Editor.tsx       # 主编辑器组件
│   │   ├── Editor.css       # 编辑器样式
│   │   ├── Toolbar.tsx      # 工具栏组件
│   │   └── Toolbar.css      # 工具栏样式
│   ├── App.tsx              # 主应用组件
│   ├── App.css              # 应用样式
│   └── main.tsx             # React 入口
├── src-tauri/               # Tauri 后端
│   ├── src/                 # Rust 源码
│   ├── Cargo.toml           # Rust 依赖
│   └── tauri.conf.json      # Tauri 配置
└── package.json             # 前端依赖和脚本
```

## 技术栈

- **前端**: React 18 + TypeScript + Vite
- **编辑器**: Milkdown Kit (完整版本)
- **主题**: Nord Theme
- **后端**: Tauri 2.0 + Rust
- **样式**: CSS + Milkdown 主题
- **构建工具**: Vite + Tauri CLI

## 特性说明

### 编辑器功能

- **格式化工具栏**: 快速插入粗体、斜体、代码、链接等格式
- **双模式编辑**: 在 Markdown 源码编辑和实时预览之间切换
- **语法高亮**: 在编辑模式下提供基础的语法识别
- **实时渲染**: 预览模式下实时渲染 Markdown 内容

### 文件管理

- **浏览器文件 API**: 支持打开本地 Markdown 文件
- **自动保存**: 支持手动保存和快捷键保存
- **文件状态指示**: 显示当前文件名和修改状态

## 开发计划

- [x] 集成完整的 Milkdown 编辑器
- [x] 实现基础文件操作（新建、打开、保存）
- [x] 添加工具栏和快捷键支持
- [x] 应用基础样式和布局
- [ ] 添加更多 Markdown 扩展语法支持
- [ ] 实现主题切换功能
- [ ] 添加设置界面
- [ ] 支持拖拽文件打开
- [ ] 添加最近文件列表
- [ ] 实现搜索和替换功能
- [ ] 添加字数统计

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

本项目基于 MIT 许可证开源。

## 致谢

- [Tauri](https://tauri.app/) - 现代桌面应用框架
- [Milkdown](https://milkdown.dev/) - 强大的 Markdown 编辑器框架
- [React](https://reactjs.org/) - 用户界面库
- [Typora](https://typora.io/) - 设计灵感来源
