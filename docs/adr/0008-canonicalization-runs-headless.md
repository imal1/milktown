# 规范化能脱离浏览器运行——在 jsdom 里，不需要真实浏览器

这是 07 号票要求实测并记录的结论。

**结论：能。** Milkdown 的 parser 与 serializer 可以在一个 jsdom 环境里跑通，不需要真实浏览器、不需要 Playwright，也不需要把缝抬到「在真实编辑器实例中执行」。因此后续票的形状不变，历史模块与差异逻辑照原样落地。

## 实测细节

- 规范化模块 (`src/editor/canonicalize.ts`) 创建一个 Crepe 实例，`root` 是一个**游离的 `div`**（不插入 document），取 `parserCtx` 与 `serializerCtx` 做「文本 → 文档 → 文本」。用的是 Crepe 自己的 parser / serializer，不是裸 remark——要消除的正是 Crepe 自身的往返差异。
- 需要的不只是 `document`：Milkdown 的 ctx 计时器用的是**全局** `addEventListener` / `dispatchEvent`。手工往 `globalThis` 上塞 jsdom 的零件不够，必须跑在 vitest 的 `jsdom` 环境里（`@vitest-environment jsdom` 文件级 docblock）。
- 代价可以接受：整个规范化测试文件（含建实例）约 3 秒。仓库其余测试仍跑在 `node` 环境。

## 两个已知的往返行为

实测中撞见、且**不打算修**的两条，记录以免日后当成 bug 重查：

1. **斜体紧挨 CJK 时会被转成实体。** `*斜*与` 序列化成 `_&#x659C;_&#x4E0E;`。原因是 `_` 在 CJK 旁边无法可靠地标出强调边界，remark-stringify 选择转义。加粗（`**`）没有这个问题。ADR 0006 把斜体钉死为 `_`，这是那条决定的代价。
2. **图片会被写回 `![1.00](./a.png)`**，比例数字是 Crepe 的 ImageBlock 塞进 alt 的。这正是「Crepe 自身的往返差异」的样子——规范化的作用不是消灭它，而是让它只发生一次、此后稳定。

## Consequences

- 空文本要单独处理：空文档解析出一个空段落，序列化成 `<br />`。模块对空白输入直接返回空串。
- 应用运行时**不另建规范化实例**：编辑器本身就是用同一套 parser / serializer 配同一套 `remarkStringifyOptions`，所以 `getMarkdown()` 拿到的就是规范化文本。规范化模块服务的是脱离编辑器的场景（测试、以及日后处理外部内容）。
