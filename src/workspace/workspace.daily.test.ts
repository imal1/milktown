/**
 * @vitest-environment jsdom
 *
 * 装配起来的应用，只差 Tauri：真的 Crepe，内存文件系统。
 *
 * `workspace.test.ts` 用假编辑器验流程，`editor.daily.test.ts` 用真编辑器验
 * 编辑器。两者之间还剩一段没人看：工作区把真编辑器接进来之后，一次「打开、
 * 改、保存」落到磁盘上的到底是什么。源码模式的真相源交接（ADR 0009）也只在
 * 这一层才是真的——假编辑器里它是一个字符串赋值。
 */
import { describe, expect, it } from 'vitest'

import { mountEditor } from '../editor/editor'
import { createFileService } from '../files/file-service'
import { createMemoryFileSystem } from '../files/memory-ports'
import { createHistory } from '../history/version-store'
import { createRecentFiles, type KeyValuePort } from '../recent/recent-files'
import type { WindowsPort } from '../windows/windows'
import { createDrafts } from './drafts'
import { createWorkspace } from './workspace'

function memoryStore(): KeyValuePort {
  const map = new Map<string, string>()
  return { get: (key) => map.get(key) ?? null, set: (key, value) => void map.set(key, value) }
}

const idleWindows: WindowsPort = {
  claim: async () => {},
  focusIfOpen: async () => false,
  openFiles: async () => {},
  openDrafts: async () => {},
  boot: async () => ({ path: null, draft: null, startupPaths: [] }),
}

async function setup(seed: Record<string, string> = {}, pickToSave: string | null = null) {
  const fs = createMemoryFileSystem(seed)
  const now = () => new Date('2026-09-05T10:00:00.000Z')
  const host = document.body.appendChild(document.createElement('div'))

  const workspace = createWorkspace({
    files: createFileService(fs, {
      pickFileToOpen: async () => null,
      pickFileToSave: async () => pickToSave,
      alert: async () => {},
    }),
    history: createHistory(fs, { now }),
    recent: createRecentFiles(memoryStore()),
    drafts: createDrafts(memoryStore()),
    windows: idleWindows,
    pickFileToOpen: async () => null,
    alert: async () => {},
    confirm: async () => 'discard',
    mountEditor,
    closeWindow: async () => {},
    now,
  })

  await workspace.start(host)
  return { workspace, fs, host }
}

describe('打开与保存', () => {
  it('打开、一个字不改、保存——磁盘上的文件一个字节没变', async () => {
    const source = '# 标题\n\n正文，带 _斜体_ 和 **加粗**。\n\n- 甲\n- 乙\n'
    const { workspace, fs } = await setup({ '/notes/a.md': source })

    await workspace.openPath('/notes/a.md')
    await workspace.save()

    expect(fs.files.get('/notes/a.md')).toBe(source)
  }, 30_000)

  it('以列表结尾的文件，反复开存不会长胖', async () => {
    const source = '# 标题\n\n- 甲\n- 乙\n'
    const { workspace, fs } = await setup({ '/notes/a.md': source })

    for (let round = 0; round < 3; round++) {
      await workspace.openPath('/notes/a.md')
      await workspace.save()
    }

    expect(fs.files.get('/notes/a.md')).toBe(source)
  }, 30_000)

  it('打开之后没改动，不算脏', async () => {
    const { workspace } = await setup({ '/notes/a.md': '# 标题\n\n正文\n' })
    await workspace.openPath('/notes/a.md')
    expect(workspace.dirty.value).toBe(false)
  }, 30_000)

  it('新文档保存走另存为，落到用户选的路径上', async () => {
    const { workspace, fs } = await setup({}, '/notes/新.md')
    await workspace.save()
    expect(fs.files.has('/notes/新.md')).toBe(true)
    expect(workspace.currentPath.value).toBe('/notes/新.md')
    expect(workspace.dirty.value).toBe(false)
  }, 30_000)
})

describe('源码模式的真相源交接', () => {
  it('进出源码模式，文档不变、也不变脏（ADR 0009）', async () => {
    const source = '# 标题\n\n- 甲\n- 乙\n'
    const { workspace } = await setup({ '/notes/a.md': source })
    await workspace.openPath('/notes/a.md')

    await workspace.toggleSourceMode()
    expect(workspace.sourceText.value).toBe(source)
    expect(workspace.dirty.value).toBe(false)

    await workspace.toggleSourceMode()
    expect(workspace.sourceMode.value).toBe(false)
    expect(workspace.dirty.value).toBe(false)
  }, 30_000)

  it('源码模式里改的原文，⌘S 原样落盘，不经规范化', async () => {
    const { workspace, fs } = await setup({ '/notes/a.md': '# 标题\n' })
    await workspace.openPath('/notes/a.md')
    await workspace.toggleSourceMode()

    // `*` 与 `__` 都不是规范化后的写法：源码模式保存的是原文本身。
    workspace.editSource('# 标题\n\n* 甲\n* 乙\n')
    await workspace.save()

    expect(fs.files.get('/notes/a.md')).toBe('# 标题\n\n* 甲\n* 乙\n')
  }, 30_000)

  it('源码模式改完退回写作视图，内容跟着回去', async () => {
    const { workspace } = await setup({ '/notes/a.md': '# 标题\n' })
    await workspace.openPath('/notes/a.md')
    await workspace.toggleSourceMode()
    workspace.editSource('# 换了的标题\n')
    await workspace.toggleSourceMode()

    await workspace.toggleSourceMode()
    expect(workspace.sourceText.value).toBe('# 换了的标题\n')
  }, 30_000)

  it('字数在 ⌘/ 前后不跳变（ADR 0009）', async () => {
    const { workspace } = await setup({ '/notes/a.md': '# 标题\n\n正文一行\n' })
    await workspace.openPath('/notes/a.md')
    const before = workspace.words.value
    await workspace.toggleSourceMode()
    expect(workspace.words.value).toBe(before)
  }, 30_000)
})

describe('版本历史', () => {
  it('第一次保存补写「打开时那一版」，两版都在（ADR 0004）', async () => {
    const { workspace, fs } = await setup({ '/notes/a.md': '# 标题\n\n原文\n' })
    await workspace.openPath('/notes/a.md')
    await workspace.toggleSourceMode()
    workspace.editSource('# 标题\n\n改过的\n')
    await workspace.save()

    const versions = [...fs.files.keys()].filter((path) => path.includes('.milktown'))
    expect(versions.length).toBe(2)
  }, 30_000)

  it('只看一眼不保存，不在用户目录里建 .milktown', async () => {
    const { workspace, fs } = await setup({ '/notes/a.md': '# 标题\n' })
    await workspace.openPath('/notes/a.md')
    expect([...fs.files.keys()].some((path) => path.includes('.milktown'))).toBe(false)
    expect([...fs.dirs].some((path) => path.includes('.milktown'))).toBe(false)
  }, 30_000)
})
