# 前端改用 Vue，编辑器采用 Milkdown Crepe

milktown 原本是 React + 裸 Milkdown Kit，编辑器缺少全部编辑辅助 UI（无斜杠菜单、无浮动格式条、无表格手柄）。我们决定改用 Milkdown 官方的开箱编辑器 **Crepe**，并把整个前端从 React 改写为 **Vue 3**。

理由是 Crepe 的浮层 UI 由完整 Vue 运行时驱动（`createApp` / `defineComponent` / `h`，共 20 处 `import from 'vue'`）。在 React 应用里用 Crepe 可行且不需要写任何 Vue 代码，但 bundle 会同时存在 React 与 Vue 两个运行时。我们不接受单个应用存在两个 UI 框架运行时，因此选择向 Crepe 对齐，而不是绕开它。

## Considered Options

用户在决策过程中依次考察并否决了以下方案，记录于此以免日后重复讨论：

- **裸 Milkdown Kit + 自建 UI**（现状的延续）—— 否决。斜杠菜单、浮动格式条、表格手柄、代码块语言选择器四个组件都要从零实现，而这正是 Crepe 已完成的部分。本项目定位为自用优先，这些工时不产出任何项目独有的价值。
- **Crepe + React**（保留 React 19）—— 否决。功能上完全可行，且不需要编写 Vue 代码，但 bundle 内会并存 React 与 Vue 两个运行时。否决理由是框架洁癖，不是技术阻碍。
- **Tiptap / BlockNote 等其他 ProseMirror 系框架** —— 否决。Tiptap 生态显著大于 Milkdown，但其 Markdown 读写依赖第三方的 `tiptap-markdown`（仍在 0.9.0）。milktown 是 Markdown 编辑器，Markdown 保真度优先于生态规模。Remirror 因 peer 锁死 React 18 直接出局。
- **双栏源码 + 实时预览**（CodeMirror 6 + markdown-it）—— 否决。该形态与 ProseMirror 系完全不兼容，且推翻了 README 中「灵感来自 Typora」的产品定位（Typora 的核心主张正是消灭双栏）。曾一度选中，后放弃。

## Consequences

- React 相关依赖全部移除：`react`、`react-dom`、`@types/react`、`@types/react-dom`、`@vitejs/plugin-react`、`@milkdown/react`、`@prosemirror-adapter/react`。
- `@milkdown/theme-nord` 移除，Crepe 自带六套主题。
- **不需要安装 `@milkdown/vue`。** 该包是裸 Kit 的 Vue 绑定；Crepe 是 vanilla class，在 Vue 组件里用 `ref` + `onMounted` 直接挂载即可。
- Q4 决定的「全拉满」中，React 19 一项自动作废。剩余升级项为 Vite 8、TypeScript 7、Milkdown 7.22。
- `src/` 下现有的 `App.tsx`、`components/Editor.tsx`、`components/Toolbar.tsx` 全部重写。
