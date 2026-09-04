import { describe, expect, it } from 'vitest'

import { describeDrop } from './drag-drop'

describe('describeDrop', () => {
  it('单个 Markdown 文件：在此打开', () => {
    expect(describeDrop(['/tmp/草稿-0904.md'], false, '未命名')).toEqual({
      ok: true,
      line: '在此打开',
      name: '草稿-0904.md',
      warn: undefined,
    })
  })

  it('多个文件时只取第一个，文案说清楚', () => {
    const hint = describeDrop(['/tmp/a.md', '/tmp/b.md'], false, '未命名')
    expect(hint).toMatchObject({ ok: true, line: '只能打开一个 · 松手取第一个', name: 'a.md' })
  })

  it('后缀不在清单里的拒绝落下', () => {
    expect(describeDrop(['/tmp/a.png'], false, '未命名')).toEqual({
      ok: false,
      line: '不认识 .png',
    })
  })

  it('没有后缀的也拒绝，且不出现空的点', () => {
    expect(describeDrop(['/tmp/README'], false, '未命名')?.line).toBe('不认识 这种文件')
  })

  it('当前文档是脏的时候预告会问', () => {
    expect(describeDrop(['/tmp/a.md'], true, '2026-09.md')?.warn).toBe(
      '2026-09.md 有未保存修改，松手后先问你'
    )
  })

  it('空清单不显示覆盖层', () => {
    expect(describeDrop([], false, '未命名')).toBeNull()
  })
})
