import { describe, expect, it } from 'vitest'

import { planBoot } from './boot'

const blank = { path: null, draft: null, startupPaths: [], draftIds: [] }

describe('planBoot', () => {
  it('被指派了文件就装它，不再看启动参数和草稿', () => {
    expect(
      planBoot({ ...blank, path: '/tmp/a.md', startupPaths: ['/tmp/b.md'], draftIds: ['d1'] })
    ).toEqual({ load: { path: '/tmp/a.md' }, files: [], drafts: [] })
  })

  it('被指派了草稿就恢复它', () => {
    expect(planBoot({ ...blank, draft: 'd1' })).toEqual({
      load: { draft: 'd1' },
      files: [],
      drafts: [],
    })
  })

  it('启动参数第一个自己装，其余各开一个窗口', () => {
    expect(planBoot({ ...blank, startupPaths: ['/tmp/a.md', '/tmp/b.md', '/tmp/c.md'] })).toEqual({
      load: { path: '/tmp/a.md' },
      files: ['/tmp/b.md', '/tmp/c.md'],
      drafts: [],
    })
  })

  it('双击文件启动时草稿留着不动', () => {
    expect(planBoot({ ...blank, startupPaths: ['/tmp/a.md'], draftIds: ['d1', 'd2'] })).toEqual({
      load: { path: '/tmp/a.md' },
      files: [],
      drafts: [],
    })
  })

  it('空手启动时 N 份草稿开 N 个窗口', () => {
    expect(planBoot({ ...blank, draftIds: ['d1', 'd2', 'd3'] })).toEqual({
      load: { draft: 'd1' },
      files: [],
      drafts: ['d2', 'd3'],
    })
  })

  it('零草稿零参数时开一个空窗口', () => {
    expect(planBoot(blank)).toEqual({ load: null, files: [], drafts: [] })
  })
})
