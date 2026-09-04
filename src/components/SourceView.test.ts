/**
 * @vitest-environment jsdom
 *
 * 文本区的两处改写走的都是 `setRangeText`（保留原生撤销栈），这里盯住它们
 * 交出去的结果。查找本身的逻辑在 `editor/find.test.ts`。
 */
import { createApp, type App as VueApp } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'

import SourceView from './SourceView.vue'

let app: VueApp | undefined
let host: HTMLElement | undefined

afterEach(() => {
  app?.unmount()
  host?.remove()
})

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

function mount(text: string, findOpen = false) {
  const edit = vi.fn()
  host = document.createElement('div')
  document.body.append(host)
  app = createApp(SourceView, { text, findOpen, onEdit: edit })
  app.mount(host)
  const area = host.querySelector('textarea') as HTMLTextAreaElement
  return { edit, area, host: host }
}

it('Tab 插入两个空格，不移出焦点', async () => {
  const t = mount('abc')
  t.area.setSelectionRange(0, 0)

  t.area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
  await tick()

  expect(t.edit).toHaveBeenCalledWith('  abc')
  expect(document.activeElement).toBe(t.area)
})

it('全部替换一次改写整块文本，只交出一次结果', async () => {
  const t = mount('横栏 和 横栏', true)
  await tick()
  const input = t.host.querySelectorAll('input')[0] as HTMLInputElement
  const replace = t.host.querySelectorAll('input')[1] as HTMLInputElement
  input.value = '横栏'
  input.dispatchEvent(new Event('input'))
  replace.value = '标题栏'
  replace.dispatchEvent(new Event('input'))
  await tick()

  const all = [...t.host.querySelectorAll('button')].find((b) => b.textContent === '全部')!
  all.click()
  await tick()

  expect(t.edit).toHaveBeenCalledTimes(1)
  expect(t.edit).toHaveBeenCalledWith('标题栏 和 标题栏')
})

it('查找条数出全部匹配，无匹配时显示 0 / 0', async () => {
  const t = mount('横栏 和 横栏', true)
  await tick()
  const input = t.host.querySelector('input') as HTMLInputElement

  input.value = '横栏'
  input.dispatchEvent(new Event('input'))
  await tick()
  expect(t.host.querySelector('.count')?.textContent?.trim()).toBe('1 / 2')

  input.value = '没有这个'
  input.dispatchEvent(new Event('input'))
  await tick()
  expect(t.host.querySelector('.count')?.textContent?.trim()).toBe('0 / 0')
})
