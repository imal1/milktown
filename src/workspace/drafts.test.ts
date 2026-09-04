import { beforeEach, describe, expect, it } from 'vitest'

import type { KeyValuePort } from '../recent/recent-files'
import { createDrafts } from './drafts'

function memoryStore(): KeyValuePort {
  const map = new Map<string, string>()
  return { get: (k) => map.get(k) ?? null, set: (k, v) => void map.set(k, v) }
}

let drafts = createDrafts(memoryStore())

beforeEach(() => {
  drafts = createDrafts(memoryStore())
})

describe('drafts', () => {
  it('落下的草稿读得回来', () => {
    const id = drafts.put('半夜想到的三件事', 100)
    expect(drafts.get(id)).toEqual({ id, content: '半夜想到的三件事', at: 100 })
  })

  it('一个窗口一份：关三个未保存的窗口就有三份', () => {
    drafts.put('一', 100)
    drafts.put('二', 200)
    drafts.put('三', 300)
    expect(drafts.list().map((d) => d.content)).toEqual(['三', '二', '一'])
  })

  it('带着原来的 id 再落一次是覆盖，不是新增', () => {
    const id = drafts.put('第一版', 100)
    const again = drafts.put('第二版', 200, id)
    expect(again).toBe(id)
    expect(drafts.list()).toEqual([{ id, content: '第二版', at: 200 }])
  })

  it('删掉之后就不在了', () => {
    const id = drafts.put('内容', 100)
    drafts.remove(id)
    expect(drafts.list()).toEqual([])
    expect(drafts.get(id)).toBeUndefined()
  })

  it('存储里是垃圾时当作没有草稿', () => {
    const store = memoryStore()
    store.set('milktown.drafts', '{不是 JSON')
    expect(createDrafts(store).list()).toEqual([])
  })
})
