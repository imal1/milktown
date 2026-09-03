import { dirNameOf, fileNameOf } from '../files/file-service'
import type { ClockPort, FileSystemPort } from '../files/ports'

export interface Version {
  /** 留存时刻。 */
  savedAt: Date
  /** 版本文件的完整路径。 */
  path: string
}

export interface History {
  /** 一个文件的全部版本，按时间倒序。 */
  list: (filePath: string) => Promise<Version[]>
  /** 读出某个版本的完整内容。 */
  read: (version: Version) => Promise<string>
  /**
   * 留存一版。距上一版不足 5 分钟就覆盖它，不新增。
   * `force: true` 用于打开与关闭这两个天然边界，不受窗口约束。
   */
  keep: (filePath: string, content: string, options?: { force?: boolean }) => Promise<Version>
}

/** 版本存在文件旁边的隐藏目录里（ADR 0005）。 */
export const HISTORY_DIR = '.milktown'

const MERGE_WINDOW_MS = 5 * 60 * 1000

export function versionsDirOf(filePath: string): string {
  return `${dirNameOf(filePath)}/${HISTORY_DIR}/${fileNameOf(filePath)}`
}

/** `2026-09-04T07-38-12-345Z.md` —— 人工检视时可读，且能还原出留存时刻。 */
export function versionFileName(savedAt: Date): string {
  return `${savedAt.toISOString().replace(/[:.]/g, '-')}.md`
}

export function parseVersionFileName(name: string): Date | null {
  const stem = name.replace(/\.md$/, '')
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/.exec(stem)
  if (!match) return null
  const [, y, mo, d, h, mi, s, ms] = match
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}.${ms}Z`)
}

export function createHistory(fs: FileSystemPort, clock: ClockPort): History {
  const list = async (filePath: string): Promise<Version[]> => {
    const dir = versionsDirOf(filePath)
    let names: string[]
    try {
      names = await fs.readDir(dir)
    } catch {
      return [] // 还没有历史目录，不是错误。
    }

    return names
      .map((name) => {
        const savedAt = parseVersionFileName(name)
        // 无法识别的条目跳过，其余版本正常返回。
        return savedAt ? { savedAt, path: `${dir}/${name}` } : null
      })
      .filter((v): v is Version => v !== null)
      .sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime())
  }

  return {
    list,

    read: (version) => fs.readTextFile(version.path),

    keep: async (filePath, content, options) => {
      const dir = versionsDirOf(filePath)
      const now = clock.now()
      const previous = (await list(filePath))[0]

      await fs.mkdir(dir)
      const version: Version = { savedAt: now, path: `${dir}/${versionFileName(now)}` }
      await fs.writeTextFile(version.path, content)

      const sincePrevious = previous ? now.getTime() - previous.savedAt.getTime() : Infinity
      // 负数意味着上一版的时刻在未来（系统时钟被调过）。那一版更新，不能删。
      const withinWindow = sincePrevious >= 0 && sincePrevious < MERGE_WINDOW_MS
      if (previous && withinWindow && !options?.force && previous.path !== version.path) {
        // 覆盖上一版：⌘S 多数时候是肌肉记忆，不是「我要记一版」。
        await fs.remove(previous.path)
      }

      return version
    },
  }
}
