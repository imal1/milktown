import { describe, expect, it } from 'vitest'

import { isUnchanged, lineDiff } from './line-diff'

const kinds = (before: string, after: string) => lineDiff(before, after).map((l) => l.kind)

describe('行级差异', () => {
  it('内容未变时差异为空', () => {
    const text = '# 标题\n\n一段话\n'
    expect(isUnchanged(lineDiff(text, text))).toBe(true)
    expect(kinds(text, text)).toEqual(['same', 'same', 'same'])
  })

  it('只改一行时只报告那一行', () => {
    const before = '一\n二\n三\n'
    const after = '一\n改过的二\n三\n'

    expect(lineDiff(before, after)).toEqual([
      { kind: 'same', text: '一' },
      { kind: 'removed', text: '二' },
      { kind: 'added', text: '改过的二' },
      { kind: 'same', text: '三' },
    ])
  })

  it('新增的行标为 added', () => {
    expect(lineDiff('一\n', '一\n二\n')).toEqual([
      { kind: 'same', text: '一' },
      { kind: 'added', text: '二' },
    ])
  })

  it('删掉的行标为 removed', () => {
    expect(lineDiff('一\n二\n', '一\n')).toEqual([
      { kind: 'same', text: '一' },
      { kind: 'removed', text: '二' },
    ])
  })

  it('从空到有内容，全部是新增', () => {
    expect(kinds('', '一\n二\n')).toEqual(['added', 'added'])
  })

  it('内容清空，全部是删除', () => {
    expect(kinds('一\n二\n', '')).toEqual(['removed', 'removed'])
  })

  it('中间插入一段时，前后未变的行仍标为 same', () => {
    const diff = lineDiff('一\n二\n三\n', '一\n新\n二\n三\n')
    expect(diff.filter((l) => l.kind !== 'same')).toEqual([{ kind: 'added', text: '新' }])
  })

  it('两段都为空时差异为空', () => {
    expect(lineDiff('', '')).toEqual([])
    expect(isUnchanged(lineDiff('', ''))).toBe(true)
  })
})
