/// <reference types="vite/client" />

// 单文件组件的类型检查交给 IDE（Volar）。构建期的 `tsc --noEmit` 只覆盖 .ts，
// 因为 vue-tsc 依赖 TypeScript 的 JS 编译器 API，在 TS 7 下不可用（ADR 0003）。
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
