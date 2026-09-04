import type { KeyValuePort } from '../recent/recent-files'

/** 一个从未保存过的文档在窗口关闭时留下的完整内容（ADR 0010）。 */
export interface Draft {
  id: string
  content: string
  /** 落下这份草稿的时刻，epoch 毫秒。 */
  at: number
}

/** 与最近文件同处 local storage（ADR 0007），不进 `.milktown/`。 */
const KEY = 'milktown.drafts'

export interface Drafts {
  /** 新的在前。 */
  list: () => Draft[]
  get: (id: string) => Draft | undefined
  /** 落一份草稿。给了 id 就覆盖那一份，否则新建一份。返回这份草稿的 id。 */
  put: (content: string, at: number, id?: string) => string
  remove: (id: string) => void
}

export function createDrafts(store: KeyValuePort): Drafts {
  const load = (): Draft[] => {
    let raw: string | null = null
    try {
      raw = store.get(KEY)
    } catch {
      return [] // 存储不可用时静默降级，跟最近文件一样。
    }
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter(
        (item): item is Draft =>
          !!item &&
          typeof (item as Draft).id === 'string' &&
          typeof (item as Draft).content === 'string' &&
          typeof (item as Draft).at === 'number'
      )
    } catch {
      return []
    }
  }

  const persist = (drafts: Draft[]) => {
    try {
      store.set(KEY, JSON.stringify(drafts))
    } catch {
      // 草稿存不下是真的丢东西，但这里除了闭嘴没有别的能做——
      // 抛出去只会让关窗这条路也断掉。
    }
  }

  const sorted = () => load().sort((a, b) => b.at - a.at)

  return {
    list: sorted,

    get: (id) => load().find((d) => d.id === id),

    put: (content, at, id) => {
      const key = id ?? `${at}-${Math.random().toString(36).slice(2, 8)}`
      persist([{ id: key, content, at }, ...load().filter((d) => d.id !== key)])
      return key
    },

    remove: (id) => persist(load().filter((d) => d.id !== id)),
  }
}
