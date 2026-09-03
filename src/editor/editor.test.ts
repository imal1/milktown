/**
 * @vitest-environment jsdom
 *
 * 脏标记由文档变更事件置位（ADR 0002），所以「挂载现成内容不算变更」
 * 是这条设计的前提：否则每次打开文件都会立刻变脏。
 */
import { expect, it } from 'vitest'
import { mountEditor } from './editor'
it('挂载已有内容不应触发文档变更事件', async () => {
  const host = document.createElement('div'); document.body.append(host)
  const ed = await mountEditor(host, '# 标题\n\n正文\n')
  let fired = 0
  ed.onChange(() => fired++)
  await new Promise(r => setTimeout(r, 200))
  expect(fired).toBe(0)
  expect(ed.getMarkdown()).toContain('# 标题')
  await ed.destroy()
}, 30000)
