import { describe, expect, it } from 'vitest'

import { createRecentFiles, describeRecentFile, type KeyValuePort } from './recent-files'

function memoryStore(): KeyValuePort {
  const map = new Map<string, string>()
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => void map.set(key, value),
  }
}

const brokenStore: KeyValuePort = {
  get: () => {
    throw new Error('SecurityError: 存储不可用')
  },
  set: () => {
    throw new Error('QuotaExceededError')
  },
}

describe('最近文件', () => {
  it('最近打开的排在最前', () => {
    const recent = createRecentFiles(memoryStore())
    recent.remember('/notes/a.md', 1000)
    recent.remember('/notes/b.md', 2000)

    expect(recent.list().map((f) => f.path)).toEqual(['/notes/b.md', '/notes/a.md'])
  })

  it('重复打开同一文件不产生重复项，只更新时间', () => {
    const recent = createRecentFiles(memoryStore())
    recent.remember('/notes/a.md', 1000)
    recent.remember('/notes/b.md', 2000)
    recent.remember('/notes/a.md', 3000)

    expect(recent.list().map((f) => f.path)).toEqual(['/notes/a.md', '/notes/b.md'])
  })

  it('列表长度有上限', () => {
    const recent = createRecentFiles(memoryStore())
    for (let i = 0; i < 30; i++) recent.remember(`/notes/${i}.md`, i)

    expect(recent.list().length).toBeLessThanOrEqual(12)
    expect(recent.list()[0]!.path).toBe('/notes/29.md')
  })

  it('打开失败的文件被移除', () => {
    const recent = createRecentFiles(memoryStore())
    recent.remember('/notes/a.md', 1000)
    recent.remember('/notes/坏.md', 2000)

    recent.forget('/notes/坏.md')

    expect(recent.list().map((f) => f.path)).toEqual(['/notes/a.md'])
  })

  it('存储不可用时不崩溃，列表为空', () => {
    const recent = createRecentFiles(brokenStore)

    expect(() => recent.remember('/notes/a.md', 1000)).not.toThrow()
    expect(recent.list()).toEqual([])
  })

  it('存储里是坏数据时当作空列表', () => {
    const store = memoryStore()
    store.set('milktown.recent-files', '{不是 JSON')

    expect(createRecentFiles(store).list()).toEqual([])
  })

  it('每一项显示文件名、所在目录、最后打开时间', () => {
    const now = Date.parse('2026-09-04T12:00:00Z')
    const described = describeRecentFile(
      { path: '/Users/imali/notes/2026-09.md', openedAt: now - 2 * 3600_000 },
      now
    )

    expect(described.name).toBe('2026-09.md')
    expect(described.dir).toBe('…/imali/notes')
    expect(described.when).toBe('2 小时前')
  })
})
