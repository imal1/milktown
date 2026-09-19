# 0012. 编辑器可以被「打字」，取出的文档不含空段落

日期：2026-09-05

## 状态

已接受。补充 [0002](0002-editor-owns-the-document.md) 与
[0006](0006-source-level-diff-and-canonical-markdown.md)。

## 背景

仓库有 141 个通过的测试和一个不能用的编辑器。原因是没有任何一条测试跑过真的
Crepe：`mountEditor` 是注入的依赖，`workspace.test.ts` 用的是假编辑器，验的是
「工作区拿到内容之后怎么做」。编辑器自己交出来的是什么，没有人看。

要看，就得能像用户那样驱动它。而 ADR 0002 定的接口只有四件事——挂载、销毁、
取出文档、订阅变更——里面没有「打一个字」。

## 决定

### 一、`DocumentEditor` 增加两个用户层面的动作

```ts
type: (text: string) => void
press: (key: string, modifiers?: Modifiers) => void
```

它们走真的输入规则和真的 keymap：`type('# ')` 变成标题，`press('Enter')` 分段。
接口从四件事长到六件，但 ADR 0002 真正要守的是「Crepe 与 ProseMirror 的实例不
外泄」——那条没有破：视图只在 `editor.ts` 里出现，外面拿到的仍然是用户动作。

不选「测试专用的后门」或「从 DOM 上摸出 view」：前者让测试验的不是产品代码，
后者依赖 ProseMirror 的私有字段，实测在 jsdom 里根本拿不到。

### 二、`read()` 去掉空段落

Markdown 里没有「空段落」这个东西——连续空行只是块之间的分隔。编辑器里有：
按两次 Enter 留出的空行，以及列表或引用后面那个用来落光标的尾块。直接序列化，
前者写出字面的 `<br />`，后者在文件末尾多一个换行。

两条都是真实的日用缺陷，都在 `read()` 上——也就是 ⌘S 写进磁盘的那份文本。所以
`read()` 序列化之前先递归清掉空段落。

一个例外：不把容器清空。空列表项要靠里面那个空段落才写得出来。

### 三、这条修复直接服务于 0006 的不动点

在此之前 `canonicalize(read()) !== read()`——所见即所得模式下保存写出的并不是
规范化文本，ADR 0006 的承诺是假的。清掉空段落之后两者对上了。

## 后果

- 用空行调版面这件事在 Markdown 里不成立，保存后不会保留。这是对的：文件是
  Markdown，不是所见即所得的版面。
- 空列表项仍然写成 `- <br />`，正确的写法是单独一个 `-`。
  `editor.daily.test.ts` 里有一条 `it.fails` 钉着它，
  登记在 `docs/agents/daily-usable.md` 的已知缺口里。
- 验收线本身移到 `docs/agents/daily-usable.md`：一条命令 `bun run check`，
  三层回路，加上机器跑不到的那部分手测清单。
