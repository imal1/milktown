# CODING AGENTS: READ THIS FIRST

This is a **handoff bundle** from Claude Design (claude.ai/design).

A user mocked up designs in HTML/CSS/JS using an AI design tool, then exported this bundle so a coding agent can implement the designs for real.

## What you should do — IMPORTANT

**Read `otty-paper/project/Milktown 设计.dc.html` in full.** The user had this file open when they triggered the handoff, so it's almost certainly the primary design they want built. Read it top to bottom — don't skim. Then **follow its imports**: open every file it pulls in (shared components, CSS, scripts) so you understand how the pieces fit together before you start implementing.

**If anything is ambiguous, ask the user to confirm before you start implementing.** It's much cheaper to clarify scope up front than to build the wrong thing.

## About the design files

The design medium is **HTML/CSS/JS** — these are prototypes, not production code. Your job is to **recreate them pixel-perfectly** in whatever technology makes sense for the target codebase (React, Vue, native, whatever fits). Match the visual output; don't copy the prototype's internal structure unless it happens to fit.

**Don't render these files in a browser or take screenshots unless the user asks you to.** Everything you need — dimensions, colors, layout rules — is spelled out in the source. Read the HTML and CSS directly; a screenshot won't tell you anything they don't.

## Bundle contents

- `otty-paper/README.md` — this file
- `otty-paper/project/` — the `Otty 设计风格 Paper 版本` project files (HTML prototypes, assets, components)

---

# 代码已经领先这份稿子的地方

**这份稿子是提案，不是真相源。** 它是 Claude Design 的导出物，手改会在下次导出时丢，所以落地之后出现的分歧一律回写 `CONTEXT.md` 与 `docs/adr/`，不回写 HTML。下面这张表记的就是分歧，读稿子时以右栏为准。

规格卡对应的七张票（#19–#25）已经全部落地，实现过程中有四处与稿子对不上：

| 规格卡怎么写的 | 实际是什么 | 以哪个为准 |
| --- | --- | --- |
| 字数「中文按字计，西文按词计，不含 Markdown 标记」 | 原文字符数，去掉首尾空白，**含**标记（`src/workspace/word-count.ts`） | **代码**。ADR 0009 定的口径：数人写下的那份 Markdown，⌘/ 前后才不跳变。按词计要引分词器，且在源码模式下没法自洽——口径稳定比口径精确重要。 |
| 「⇧⌘/，与 ⌘/、⌥⌘/ 三项互斥打勾」 | 四项互斥：源码模式 ⌘/、原文对照 ⌥⌘/、磁盘对照 ⇧⌘/、**版本对照 ⇧⌘H**（`src-tauri/src/lib.rs`） | **代码**。ADR 0015 把这四个视图定成一个互斥组。版本对照的菜单项已在位，界面是 #2 / #12 的活。 |
| 磁盘对照卡首句「版本对照，不是另一个页面」 | 这里说的是**双页视图**这个上位词。「版本对照」在 `CONTEXT.md` 里专指 ⇧⌘H 那一个，不能拿来泛指 | **CONTEXT.md**。三个双页视图各有各的名字：原文对照、磁盘对照、版本对照。 |
| 拖拽提示「松手打开 · 当前文档会留在这个窗口」 | 拖进来的文件装进**当前窗口**，当前文档若是脏的先弹确认（`src/workspace/drag-drop.ts`） | **ADR 0011**。四条入口里只有 Finder 双击和命令行参数会开新窗口。 |

「写作面上没有工具栏」这条主张本身没有分歧，代码守住了：`src/editor/editor.ts` 关掉了 `Feature.Toolbar` 与 `Feature.BlockEdit`，18 条排版命令只在原生菜单栏里，`src/editor/format.daily.test.ts` 有一条测试直接读 `lib.rs` 的源码，菜单 id 与命令清单对不上就红。什么算工具栏、什么不算，见 ADR 0013 的「工具栏的边界」。
