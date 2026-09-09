import { describe, expect, it } from 'vitest'

import type { DiffLine } from '../history/line-diff'
import { describeChanges, diskRows, plainRows } from './compare'

describe('原文对照的两栏', () => {
  it('一行一个块：左边排版，右边同一个块的原文', () => {
    const rows = plainRows([
      { html: '<h1>标题</h1>', markdown: '# 标题' },
      { html: '<p>正文</p>', markdown: '正文' },
    ])

    expect(rows).toHaveLength(2)
    expect(rows[0]!.left.html).toBe('<h1>标题</h1>')
    expect(rows[0]!.right.text).toBe('# 标题')
    expect(rows[1]!.right.text).toBe('正文')
  })
})

describe('磁盘对照的两栏', () => {
  const diff: DiffLine[] = [
    { kind: 'same', text: '开头' },
    { kind: 'removed', text: '旧' },
    { kind: 'added', text: '新' },
  ]

  it('删掉的只在左边、加上的只在右边，对面留空', () => {
    const rows = diskRows(diff)

    expect(rows[1]!.left).toEqual({ text: '旧', kind: 'removed' })
    expect(rows[1]!.right).toEqual({ text: '', kind: 'blank' })
    expect(rows[2]!.left).toEqual({ text: '', kind: 'blank' })
    expect(rows[2]!.right).toEqual({ text: '新', kind: 'added' })
  })

  it('两栏行数永远相等——滚动时不会脱节', () => {
    const rows = diskRows(diff)

    expect(rows.map((row) => row.left).length).toBe(rows.map((row) => row.right).length)
    expect(rows).toHaveLength(diff.length)
  })
})

describe('计数条', () => {
  it('没有差异时说「没有改动」，不是空白也不是报错', () => {
    expect(describeChanges([{ kind: 'same', text: '一样' }])).toBe('没有改动')
    expect(describeChanges([])).toBe('没有改动')
  })

  it('有差异时报出增删的行数', () => {
    expect(
      describeChanges([
        { kind: 'removed', text: '旧' },
        { kind: 'added', text: '新' },
        { kind: 'added', text: '再一行' },
      ])
    ).toBe('2 行新增 · 1 行删除')
  })
})
