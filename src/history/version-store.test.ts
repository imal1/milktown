import { describe, expect, it } from 'vitest'

import { createMemoryFileSystem } from '../files/memory-ports'
import type { ClockPort } from '../files/ports'
import { createHistory, parseVersionFileName, versionsDirOf } from './version-store'

function controllableClock(start: string): ClockPort & { advance: (ms: number) => void } {
  let now = Date.parse(start)
  return {
    now: () => new Date(now),
    advance: (ms) => {
      now += ms
    },
  }
}

const MINUTE = 60_000

function setup(seed: Record<string, string> = {}) {
  const fs = createMemoryFileSystem(seed)
  const clock = controllableClock('2026-09-04T10:00:00.000Z')
  return { fs, clock, history: createHistory(fs, clock) }
}

describe('版本存储', () => {
  it('版本存放在目标文件所在目录下的隐藏目录中', async () => {
    const { fs, history } = setup()

    const version = await history.keep('/notes/2026-09.md', '正文')

    expect(version.path.startsWith('/notes/.milktown/2026-09.md/')).toBe(true)
    expect(fs.files.get(version.path)).toBe('正文')
  })

  it('条目名能还原出留存时刻', async () => {
    const { history } = setup()

    const version = await history.keep('/notes/a.md', '正文')
    const name = version.path.split('/').pop()!

    expect(parseVersionFileName(name)?.toISOString()).toBe('2026-09-04T10:00:00.000Z')
  })

  it('存的是完整内容而非增量', async () => {
    const { fs, clock, history } = setup()
    await history.keep('/notes/a.md', '第一版')
    clock.advance(10 * MINUTE)
    const second = await history.keep('/notes/a.md', '第一版\n第二段')

    expect(fs.files.get(second.path)).toBe('第一版\n第二段')
  })

  it('距上一版不足 5 分钟时覆盖它而非新增', async () => {
    const { clock, history } = setup()
    await history.keep('/notes/a.md', '一')
    clock.advance(2 * MINUTE)
    await history.keep('/notes/a.md', '二')

    const versions = await history.list('/notes/a.md')
    expect(versions).toHaveLength(1)
    expect(await history.read(versions[0]!)).toBe('二')
  })

  it('超过 5 分钟则新增一版', async () => {
    const { clock, history } = setup()
    await history.keep('/notes/a.md', '一')
    clock.advance(6 * MINUTE)
    await history.keep('/notes/a.md', '二')

    expect(await history.list('/notes/a.md')).toHaveLength(2)
  })

  it('force 时无条件新增，不受 5 分钟窗口约束', async () => {
    const { clock, history } = setup()
    await history.keep('/notes/a.md', '一')
    clock.advance(MINUTE)
    await history.keep('/notes/a.md', '二', { force: true })

    expect(await history.list('/notes/a.md')).toHaveLength(2)
  })

  it('历史按时间倒序返回', async () => {
    const { clock, history } = setup()
    await history.keep('/notes/a.md', '一')
    clock.advance(10 * MINUTE)
    await history.keep('/notes/a.md', '二')
    clock.advance(10 * MINUTE)
    await history.keep('/notes/a.md', '三')

    const versions = await history.list('/notes/a.md')
    expect(await Promise.all(versions.map(history.read))).toEqual(['三', '二', '一'])
  })

  it('同一毫秒留两版不会互相覆盖', async () => {
    const { history } = setup()
    const at = new Date('2026-09-04T10:00:00.000Z')

    await history.keep('/notes/a.md', '打开时的样子', { force: true, at })
    await history.keep('/notes/a.md', '改过之后', { force: true, at })

    const versions = await history.list('/notes/a.md')
    expect(await Promise.all(versions.map(history.read))).toEqual([
      '改过之后',
      '打开时的样子',
    ])
  })

  it('指定 at 时留存时刻用它而不是当前时间', async () => {
    const { history } = setup()
    const at = new Date('2026-09-04T08:30:00.000Z')

    const version = await history.keep('/notes/a.md', '正文', { at })

    expect(version.savedAt.toISOString()).toBe('2026-09-04T08:30:00.000Z')
  })

  it('exists 反映这个文件有没有历史', async () => {
    const { history } = setup()
    expect(await history.exists('/notes/a.md')).toBe(false)

    await history.keep('/notes/a.md', '正文')

    expect(await history.exists('/notes/a.md')).toBe(true)
  })

  it('历史目录不存在时返回空而不是报错', async () => {
    const { history } = setup()
    expect(await history.list('/notes/从未保存.md')).toEqual([])
  })

  it('目录中存在无法识别的条目时跳过它，其余版本正常返回', async () => {
    const { fs, history } = setup()
    await history.keep('/notes/a.md', '一')
    await fs.writeTextFile(`${versionsDirOf('/notes/a.md')}/.DS_Store`, '垃圾')

    const versions = await history.list('/notes/a.md')
    expect(versions).toHaveLength(1)
    expect(await history.read(versions[0]!)).toBe('一')
  })

  it('磁盘写入失败时抛出错误，不被静默吞掉', async () => {
    const { fs, history } = setup()
    fs.writeTextFile = async () => {
      throw new Error('EACCES')
    }

    await expect(history.keep('/notes/a.md', '一')).rejects.toThrow('EACCES')
  })

  it('同一目录下两个不同文件的历史互不干扰', async () => {
    const { history } = setup()
    await history.keep('/notes/a.md', 'A')
    await history.keep('/notes/b.md', 'B')

    const a = await history.list('/notes/a.md')
    const b = await history.list('/notes/b.md')
    expect(await history.read(a[0]!)).toBe('A')
    expect(await history.read(b[0]!)).toBe('B')
  })
})
