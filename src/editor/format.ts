/**
 * 排版命令的名字。纯字符串，不碰 Milkdown——所以 keymap 与工作区可以在 node
 * 环境里引用它，而只有 `editor.ts` 知道每个名字对应哪条 ProseMirror 命令。
 *
 * 写作面上没有工具栏（ADR 0013）。这份清单就是排版的全部入口：它同时是原生
 * 菜单「格式」与「段落」两栏的项目 id——`lib.rs` 里的 `MenuItem` id 与这里
 * 逐字对齐，菜单事件原样就是一个 `FormatCommand`。
 */
export type InlineFormat =
  | 'format.strong'
  | 'format.emphasis'
  | 'format.code'
  | 'format.strikethrough'
  | 'format.link'

export type BlockFormat =
  | 'block.text'
  | 'block.h1'
  | 'block.h2'
  | 'block.h3'
  | 'block.h4'
  | 'block.h5'
  | 'block.h6'
  | 'block.quote'
  | 'block.bullet'
  | 'block.ordered'
  | 'block.code'
  | 'block.table'
  | 'block.rule'

export type FormatCommand = InlineFormat | BlockFormat

export const inlineFormats: readonly InlineFormat[] = [
  'format.strong',
  'format.emphasis',
  'format.code',
  'format.strikethrough',
  'format.link',
]

export const blockFormats: readonly BlockFormat[] = [
  'block.text',
  'block.h1',
  'block.h2',
  'block.h3',
  'block.h4',
  'block.h5',
  'block.h6',
  'block.quote',
  'block.bullet',
  'block.ordered',
  'block.code',
  'block.table',
  'block.rule',
]

export const formatCommands: readonly FormatCommand[] = [...inlineFormats, ...blockFormats]

const all = new Set<string>(formatCommands)

export function isFormatCommand(value: string): value is FormatCommand {
  return all.has(value)
}
