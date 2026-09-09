/**
 * 空文档那张便条上列的几条命令。
 *
 * 写作面上没有工具栏（ADR 0013），排版命令全在菜单里——没用过菜单的人不知道
 * 它们在那儿。这张便条是补上那一步：打第一个字就走，之后不再出现。
 *
 * `id` 是它在菜单里对应的那一项，`key` 必须跟那一项的 accelerator 对得上；
 * `starter-hints.test.ts` 直接读 `lib.rs` 核对，改了一边忘了另一边会变红。
 */
export interface StarterHint {
  id: string
  label: string
  key: string
}

export const STARTER_HINTS: StarterHint[] = [
  { id: 'block.h1', label: '标题 1', key: '⌘1' },
  { id: 'format.strong', label: '加粗', key: '⌘B' },
  { id: 'block.quote', label: '引用', key: '⌥⌘Q' },
  { id: 'block.code', label: '代码块', key: '⌥⌘C' },
  { id: 'find.open', label: '查找替换', key: '⌘F' },
  { id: 'source.toggle', label: '看原文', key: '⌘/' },
]
