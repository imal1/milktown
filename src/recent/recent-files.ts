import { dirNameOf, fileNameOf } from '../files/file-service'

export interface RecentFile {
  path: string
  /** 最后打开时间，epoch 毫秒。 */
  openedAt: number
}

/** 键值存储端口。生产里是 localStorage，测试里是内存 Map。 */
export interface KeyValuePort {
  get: (key: string) => string | null
  set: (key: string, value: string) => void
}

const KEY = 'milktown.recent-files'
const LIMIT = 12

export interface RecentFiles {
  list: () => RecentFile[]
  /** 记一次打开，置顶且不产生重复项。返回新列表。 */
  remember: (path: string, openedAt: number) => RecentFile[]
  /** 打开失败的文件从列表中移除。返回新列表。 */
  forget: (path: string) => RecentFile[]
}

export function createRecentFiles(store: KeyValuePort): RecentFiles {
  const load = (): RecentFile[] => {
    let raw: string | null = null
    try {
      raw = store.get(KEY)
    } catch {
      return [] // 存储不可用：最近文件是最不重要的数据，静默降级。
    }
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter(
        (item): item is RecentFile =>
          !!item &&
          typeof (item as RecentFile).path === 'string' &&
          typeof (item as RecentFile).openedAt === 'number'
      )
    } catch {
      return []
    }
  }

  const persist = (files: RecentFile[]) => {
    try {
      store.set(KEY, JSON.stringify(files))
    } catch {
      // 同上：存不下就算了，不影响写作。
    }
    return files
  }

  return {
    list: () => load().sort((a, b) => b.openedAt - a.openedAt),

    remember: (path, openedAt) => {
      const rest = load().filter((f) => f.path !== path)
      const next = [{ path, openedAt }, ...rest]
        .sort((a, b) => b.openedAt - a.openedAt)
        .slice(0, LIMIT)
      return persist(next)
    },

    forget: (path) => persist(load().filter((f) => f.path !== path)),
  }
}

/** localStorage 实现。浏览器禁用存储时 get/set 会抛，由上面统一吞掉。 */
export const localStorageKeyValue: KeyValuePort = {
  get: (key) => localStorage.getItem(key),
  set: (key, value) => localStorage.setItem(key, value),
}

/** 面板里每一项显示的三样东西：文件名、所在目录、最后打开时间。 */
export function describeRecentFile(file: RecentFile, now: number) {
  return {
    path: file.path,
    name: fileNameOf(file.path),
    dir: shortenDir(dirNameOf(file.path)),
    when: relativeTime(file.openedAt, now),
  }
}

function shortenDir(dir: string) {
  const parts = dir.split('/').filter(Boolean)
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : dir
}

function relativeTime(then: number, now: number) {
  const minutes = Math.max(0, Math.round((now - then) / 60_000))
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} 天前`
  return new Date(then).toLocaleDateString('zh-CN')
}
