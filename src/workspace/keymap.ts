/**
 * 按键 → 意图。纯函数，不碰 DOM 也不碰状态，所以「⌘S 触发保存」这条
 * 可以在 node 环境里断言。全局快捷键只在这里定义一次。
 */
import type { FormatCommand } from '../editor/format'

/**
 * 排版命令也是意图，但它们只从原生菜单来（写作面上没有工具栏，ADR 0013），
 * 快捷键由菜单的 accelerator 提供，所以 `intentOf` 里没有它们的分支。
 */
export type Intent =
  | FormatCommand
  | 'save'
  | 'saveAs'
  | 'new'
  | 'open'
  | 'recent.toggle'
  | 'recent.prev'
  | 'recent.next'
  | 'recent.open'
  | 'recent.close'
  | 'diff.open'
  | 'diff.prev'
  | 'diff.next'
  | 'diff.restore'
  | 'diff.close'
  | 'source.toggle'
  | 'compare.plain'
  | 'compare.disk'
  | 'compare.close'
  | 'find.open'
  | 'find.close'
  | 'confirm.save'
  | 'confirm.discard'
  | 'confirm.cancel'
  | 'window.close'
  /** 有意吞掉：确认层开着时，除三个确认键外一律不放行。 */
  | 'swallow'

/** 谁在前台。确认层 > 双页视图 > 最近文件面板 > 查找条 > 写作。 */
export type Mode = 'writing' | 'recent' | 'diff' | 'compare' | 'find' | 'confirm'

export interface Keystroke {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
}

/** 换到另一个视图去的意图。互斥组里的四个，加上关窗那个出口。 */
function switchesView(intent: Intent): boolean {
  return (
    intent === 'compare.plain' ||
    intent === 'compare.disk' ||
    intent === 'source.toggle' ||
    intent === 'diff.open' ||
    intent === 'window.close'
  )
}

export function intentOf(event: Keystroke, mode: Mode): Intent | null {
  const command = event.metaKey === true || event.ctrlKey === true
  const key = event.key.toLowerCase()

  if (mode === 'confirm') {
    if (event.key === 'Enter') return 'confirm.save'
    if (event.key === 'Escape') return 'confirm.cancel'
    if (command && key === 'd') return 'confirm.discard'
    return 'swallow'
  }

  // 原文对照与磁盘对照是只读快照：Esc 出去，四个视图之间可以直接换（互斥组），
  // 别的按键一律吞掉——快照上没有可改的东西（ADR 0015）。
  if (mode === 'compare') {
    if (event.key === 'Escape') return 'compare.close'
    const next = intentOf(event, 'writing')
    return next !== null && switchesView(next) ? next : 'swallow'
  }

  if (mode === 'diff') {
    if (event.key === 'Escape') return 'diff.close'
    if (event.key === 'ArrowUp') return 'diff.prev'
    if (event.key === 'ArrowDown') return 'diff.next'
    if (event.key === 'Enter') return 'diff.restore'
  }

  // 查找条开着时 Esc 只关它，不动文档；其余按键照常落到命令上。
  if (mode === 'find' && event.key === 'Escape') return 'find.close'

  if (mode === 'recent') {
    if (event.key === 'Escape') return 'recent.close'
    if (event.key === 'ArrowUp') return 'recent.prev'
    if (event.key === 'ArrowDown') return 'recent.next'
    if (event.key === 'Enter') return 'recent.open'
  }

  if (!command) return null

  if (key === 's') return event.shiftKey ? 'saveAs' : 'save'
  if (key === 'n') return 'new'
  if (key === 'o') return event.shiftKey ? 'open' : 'recent.toggle'
  if (key === 'h' && event.shiftKey) return 'diff.open'
  // 三个 `/`：⌘/ 源码模式，⌥⌘/ 原文对照，⇧⌘/ 磁盘对照。
  // ⌥ 按下时 macOS 把这个键的 `key` 变成 `÷`，所以两个字符都认。
  if (key === '/' || key === '÷') {
    if (event.altKey === true) return 'compare.plain'
    if (event.shiftKey === true) return 'compare.disk'
    return 'source.toggle'
  }
  if (key === 'f') return 'find.open'
  // ⌘W 与 ⌘Q 都走关窗：无边框窗口没有系统菜单栏，这是唯一的键盘出口。
  if (key === 'w' || key === 'q') return 'window.close'

  return null
}
