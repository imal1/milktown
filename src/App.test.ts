/**
 * @vitest-environment jsdom
 *
 * 冒烟测试：应用能挂起来、编辑器真的在里面、标题栏显示未命名文档。
 * 更细的行为在各模块自己的测试里，这里只保证接线没断。
 */
import { createApp, type App as VueApp } from 'vue'
import { afterEach, expect, it } from 'vitest'

import App from './App.vue'

let app: VueApp | undefined
let host: HTMLElement | undefined

afterEach(() => {
  app?.unmount()
  host?.remove()
})

const tick = () => new Promise((resolve) => setTimeout(resolve, 50))

it('应用挂载后编辑器可用，标题栏显示「未命名」与字数 0', async () => {
  host = document.createElement('div')
  document.body.append(host)

  app = createApp(App)
  app.mount(host)
  await tick()

  expect(host.querySelector('.titlebar')?.textContent).toContain('未命名')
  expect(host.querySelector('.milktown-editor .milkdown')).not.toBeNull()
  expect(host.querySelector('.words')?.textContent?.replace(/\s+/g, '')).toBe('0字')
}, 30_000)

it('空文档的纸上有起手提示，最近文件一个都没有时也在', async () => {
  host = document.createElement('div')
  document.body.append(host)

  app = createApp(App)
  app.mount(host)
  await tick()

  expect(host.querySelector('.empty-state .hint')?.textContent).toContain('直接开始写')
}, 30_000)

it('空文档的便条列着最常用的几条，写着菜单里那几个键', async () => {
  host = document.createElement('div')
  document.body.append(host)

  app = createApp(App)
  app.mount(host)
  await tick()

  const rows = [...host.querySelectorAll('.empty-state .starter-row')].map((row) =>
    row.textContent?.replace(/\s+/g, '')
  )
  expect(rows).toEqual(['标题1⌘1', '加粗⌘B', '引用⌥⌘Q', '代码块⌥⌘C', '查找替换⌘F', '看原文⌘/'])
  expect(host.querySelector('.empty-state .starter-note')?.textContent).toContain('打第一个字')
}, 30_000)
