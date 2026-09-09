/**
 * @vitest-environment jsdom
 *
 * 标题栏上那三样：文件名热区、脏点、字数。热区的尺寸与配色在 CSS 里，这里
 * 盯住的是「什么时候出现、点下去发生什么」。
 */
import { createApp, type App as VueApp } from 'vue'
import { afterEach, expect, it, vi } from 'vitest'

import { countStats } from '../workspace/word-count'
import TitleBar from './TitleBar.vue'

let app: VueApp | undefined
let host: HTMLElement | undefined

afterEach(() => {
  app?.unmount()
  host?.remove()
})

function mount(props: Record<string, unknown> = {}) {
  const toggleRecent = vi.fn()
  const toggleStats = vi.fn()
  host = document.body.appendChild(document.createElement('div'))
  app = createApp(TitleBar, {
    fileName: '甲.md',
    dirty: false,
    words: 12,
    recentOpen: false,
    sourceMode: false,
    statsOpen: false,
    stats: countStats(''),
    onToggleRecent: toggleRecent,
    onToggleStats: toggleStats,
    ...props,
  })
  app.mount(host)
  return { host, toggleRecent, toggleStats }
}

it('脏的时候是一个点，不是星号——星号会跟文件名连成一串读', () => {
  const clean = mount()
  expect(clean.host.querySelector('.dot')).toBeNull()
  expect(clean.host.querySelector('.title')?.textContent).not.toContain('*')

  app?.unmount()
  host?.remove()

  const dirty = mount({ dirty: true })
  expect(dirty.host.querySelector('.dot')).not.toBeNull()
})

it('文件名和 ▾ 是一个可点的整体，点它开最近文件', () => {
  const { host: el, toggleRecent } = mount()

  const title = el.querySelector<HTMLButtonElement>('.title')
  expect(title?.textContent).toContain('甲.md')
  expect(title?.textContent).toContain('▾')

  title?.click()
  expect(toggleRecent).toHaveBeenCalledOnce()
})

it('字数带着口径写在后面，点它开口径面板', () => {
  const { host: el, toggleStats } = mount()

  expect(el.querySelector('.words')?.textContent?.replace(/\s+/g, '')).toBe('12字')
  expect(el.querySelector('.stats')).toBeNull()

  el.querySelector<HTMLButtonElement>('.words')?.click()
  expect(toggleStats).toHaveBeenCalledOnce()
})

it('口径面板摊开这个数是怎么来的', () => {
  const { host: el } = mount({
    statsOpen: true,
    stats: countStats('# 标题\n\n一段\n还是这一段'),
  })

  const rows = [...el.querySelectorAll('.stats .row')].map((row) =>
    row.textContent?.replace(/\s+/g, '')
  )
  expect(rows).toEqual(['字数14', '段落2', '行4', '约读1分钟'])
  expect(el.querySelector('.caliber')?.textContent).toContain('去掉首尾空白')
})
