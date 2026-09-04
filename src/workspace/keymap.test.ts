import { describe, expect, it } from 'vitest'

import { intentOf, type Mode } from './keymap'

const cmd = (key: string, shiftKey = false) => ({ key, metaKey: true, shiftKey })
const plain = (key: string) => ({ key })

describe('按键映射', () => {
  it('写作时的四个文件操作', () => {
    expect(intentOf(cmd('s'), 'writing')).toBe('save')
    expect(intentOf(cmd('s', true), 'writing')).toBe('saveAs')
    expect(intentOf(cmd('n'), 'writing')).toBe('new')
    expect(intentOf(cmd('o', true), 'writing')).toBe('open')
  })

  it('⌘O 开最近文件面板，⇧⌘O 才是文件对话框', () => {
    expect(intentOf(cmd('o'), 'writing')).toBe('recent.toggle')
    expect(intentOf(cmd('o', true), 'writing')).toBe('open')
  })

  it('⇧⌘H 进双页视图', () => {
    expect(intentOf(cmd('h', true), 'writing')).toBe('diff.open')
    expect(intentOf(cmd('h'), 'writing')).toBeNull()
  })

  it('⌘W 与 ⌘Q 都是关窗', () => {
    expect(intentOf(cmd('w'), 'writing')).toBe('window.close')
    expect(intentOf(cmd('q'), 'writing')).toBe('window.close')
  })

  it('Ctrl 与 Cmd 等价', () => {
    expect(intentOf({ key: 's', ctrlKey: true }, 'writing')).toBe('save')
  })

  it('没有修饰键的普通输入不触发任何意图', () => {
    expect(intentOf(plain('s'), 'writing')).toBeNull()
    expect(intentOf(plain('ArrowDown'), 'writing')).toBeNull()
  })

  it('最近文件面板：方向键、回车、Esc', () => {
    expect(intentOf(plain('ArrowDown'), 'recent')).toBe('recent.next')
    expect(intentOf(plain('ArrowUp'), 'recent')).toBe('recent.prev')
    expect(intentOf(plain('Enter'), 'recent')).toBe('recent.open')
    expect(intentOf(plain('Escape'), 'recent')).toBe('recent.close')
  })

  it('双页视图：方向键选版本、回车还原、Esc 退出', () => {
    expect(intentOf(plain('ArrowDown'), 'diff')).toBe('diff.next')
    expect(intentOf(plain('ArrowUp'), 'diff')).toBe('diff.prev')
    expect(intentOf(plain('Enter'), 'diff')).toBe('diff.restore')
    expect(intentOf(plain('Escape'), 'diff')).toBe('diff.close')
  })

  it('面板与双页视图开着时，⌘S 仍然可用', () => {
    expect(intentOf(cmd('s'), 'recent')).toBe('save')
    expect(intentOf(cmd('s'), 'diff')).toBe('save')
  })

  it('确认层开着时只认三个键，其余一律吞掉', () => {
    expect(intentOf(plain('Enter'), 'confirm')).toBe('confirm.save')
    expect(intentOf(cmd('d'), 'confirm')).toBe('confirm.discard')
    expect(intentOf(plain('Escape'), 'confirm')).toBe('confirm.cancel')

    for (const mode of ['confirm'] satisfies Mode[]) {
      expect(intentOf(cmd('s'), mode)).toBe('swallow')
      expect(intentOf(cmd('n'), mode)).toBe('swallow')
      expect(intentOf(plain('a'), mode)).toBe('swallow')
    }
  })
})
