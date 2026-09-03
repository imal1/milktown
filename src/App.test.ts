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
  expect(host.querySelector('.words')?.textContent).toBe('0')
}, 30_000)
