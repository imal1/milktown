## Parent

SPEC1_REF

## What to build

应用以 Vue 3 启动，Milkdown Crepe 挂载完成，用户能在窗口里打字并用上 Crepe 的编辑辅助 UI。样式尚未定稿，文件读写尚未接通——这一票只求「能打字」。

同时把测试框架装好，此后每张票自带测试。

## Acceptance criteria

- [ ] React 相关依赖全部移除：`react`、`react-dom` 及其类型定义、`@vitejs/plugin-react`、`@milkdown/react`、`@prosemirror-adapter/react`、`@milkdown/theme-nord`
- [ ] 新增 `vue` 与 `@vitejs/plugin-vue`；升级 Vite、TypeScript、`@milkdown/crepe`
- [ ] 未安装 `@milkdown/vue`——Crepe 是 vanilla class，直接挂载，不需要绑定层
- [ ] 应用启动后可在编辑器中输入文字
- [ ] Crepe 十个 feature 全部开启：斜杠命令菜单、块拖拽手柄、浮动格式条、代码块语言选择器、表格手柄、图片块、链接气泡、任务列表复选框、公式、占位提示
- [ ] 编辑器封装对外只暴露四件事：挂载、销毁、取出当前 Markdown、订阅文档变更；Crepe 实例不外泄
- [ ] 测试框架就位，能在 Vite 8 与 TypeScript 7 下运行，且无需浏览器环境即可跑纯逻辑测试
- [ ] TypeScript 未降级。若 `vue-tsc` 在 TS 7 下不可用，去掉 `vue-tsc`，不降 TypeScript，也不为迁就它放弃单文件组件写法（ADR 0003）
- [ ] `src/` 下旧的 React 组件、以及那段用于测试滚动的冗长占位内容已删除
- [ ] Rust 侧未新增代码

## Blocked by

None — can start immediately.
