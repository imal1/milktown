/**
 * 按键 → 意图。纯函数，不碰 DOM 也不碰状态，所以「⌘S 触发保存」这条
 * 可以在 node 环境里断言。全局快捷键只在这里定义一次。
 */
export type Intent =
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
  | 'confirm.save'
  | 'confirm.discard'
  | 'confirm.cancel'
  | 'window.close'
  /** 有意吞掉：确认层开着时，除三个确认键外一律不放行。 */
  | 'swallow'

/** 谁在前台。确认层 > 双页视图 > 最近文件面板 > 写作。 */
export type Mode = 'writing' | 'recent' | 'diff' | 'confirm'

export interface Keystroke {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
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

  if (mode === 'diff') {
    if (event.key === 'Escape') return 'diff.close'
    if (event.key === 'ArrowUp') return 'diff.prev'
    if (event.key === 'ArrowDown') return 'diff.next'
    if (event.key === 'Enter') return 'diff.restore'
  }

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
  // ⌘W 与 ⌘Q 都走关窗：无边框窗口没有系统菜单栏，这是唯一的键盘出口。
  if (key === 'w' || key === 'q') return 'window.close'

  return null
}
