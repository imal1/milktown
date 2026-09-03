# TypeScript 7 是硬约束，不降级

本项目使用 TypeScript 7（Go 重写的原生编译器）。这是作者明确要求的约束：遇到问题时的解法是让 TS 7 跑通，不是退回 TypeScript 5.x 或 6.x。

风险点在 `vue-tsc`：它调用 TypeScript 的编译器 API 来对单文件组件做类型检查，在 Go 版编译器上能否工作需要实测，包元数据（peer 写的是 `typescript >=5.0.0`）不足以判断。

## Consequences

- 如果 `vue-tsc` 在 TS 7 下不可用，**退路是去掉 `vue-tsc`，不是降 TypeScript**。本项目前端只有三个组件，单文件组件的类型检查可以只依赖 IDE（Volar），构建期用 `tsc --noEmit` 覆盖 `.ts` 文件即可。
- 因此也**不为了迁就类型检查器而放弃 `.vue` 单文件组件写法**。改用 TSX 或 `h()` 是比丢掉 `vue-tsc` 更大的代价。
- 升级 TypeScript 应作为**独立的、排在最后的提交**，便于定位问题——但这是为了排查方便，不是为了预留回滚。
