import { describe, expect, it } from 'vitest'

import rustSource from '../../src-tauri/src/lib.rs?raw'
import { STARTER_HINTS } from './starter-hints'

/** `Alt+CmdOrCtrl+Q` 这种写法翻成菜单上看到的样子。顺序按 macOS 的惯例。 */
function symbols(accelerator: string): string {
  const parts = accelerator.split('+')
  const key = parts[parts.length - 1]!
  const has = (name: string) => parts.includes(name)
  return (
    (has('Ctrl') ? '⌃' : '') +
    (has('Alt') ? '⌥' : '') +
    (has('Shift') ? '⇧' : '') +
    (has('CmdOrCtrl') || has('Cmd') ? '⌘' : '') +
    key
  )
}

/** 「视图」栏那四项的 id 存在一个数组里，菜单里写的是下标。 */
function viewItems(): string[] {
  const list = /const VIEW_ITEMS: \[&str; \d+\] = \[([^\]]+)\]/.exec(rustSource)?.[1] ?? ''
  return [...list.matchAll(/"([^"]+)"/g)].map((match) => match[1]!)
}

/** 菜单项的 id 到它的快捷键。id 有的是字面量，有的是 `VIEW_ITEMS[n]`。 */
function accelerators(): Map<string, string> {
  const items = viewItems()
  const pattern = /MenuItem::with_id\(app, (?:"([\w.]+)"|VIEW_ITEMS\[(\d)\]),[^)]*?Some\("([^"]+)"\)/g
  const out = new Map<string, string>()
  for (const [, literal, index, accelerator] of rustSource.matchAll(pattern)) {
    const id = literal ?? items[Number(index)]
    if (id) out.set(id, symbols(accelerator!))
  }
  return out
}

describe('起手便条上的快捷键', () => {
  it('每一条都指着菜单里真有的那一项', () => {
    const menu = accelerators()
    for (const hint of STARTER_HINTS) expect(menu.has(hint.id)).toBe(true)
  })

  it('写的键跟菜单里那一项的 accelerator 一致', () => {
    const menu = accelerators()
    const shown = STARTER_HINTS.map((hint) => `${hint.id} ${hint.key}`)
    const real = STARTER_HINTS.map((hint) => `${hint.id} ${menu.get(hint.id)}`)
    expect(shown).toEqual(real)
  })
})
