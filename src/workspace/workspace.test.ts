/**
 * @vitest-environment jsdom
 *
 * jsdom 只是为了有个 `document.createElement` 当挂载点——假编辑器不碰 DOM，
 * 这里跑的全是工作区自己的流程。
 */
import { describe, expect, it, vi } from 'vitest'

import type { DocumentEditor } from '../editor/editor'
import { createFileService } from '../files/file-service'
import { createMemoryFileSystem } from '../files/memory-ports'
import { createHistory } from '../history/version-store'
import { createRecentFiles, type KeyValuePort } from '../recent/recent-files'
import type { ConfirmChoice } from './workspace'
import { createWorkspace } from './workspace'

/** 假编辑器：文档内容就是一个字符串，改它等于用户敲了字。 */
function fakeEditor() {
  let markdown = ''
  let listener: ((markdown: string) => void) | undefined
  let destroyed = 0

  const editor: DocumentEditor = {
    destroy: async () => void destroyed++,
    read: () => markdown,
    onChange: (fn) => {
      listener = fn
    },
  }

  return {
    editor,
    get destroyed() {
      return destroyed
    },
    /** 模拟用户敲字：编辑器发出文档变更事件。 */
    type(next: string) {
      markdown = next
      listener?.(next)
    },
    setContent(next: string) {
      markdown = next
    },
  }
}

function memoryStore(): KeyValuePort {
  const map = new Map<string, string>()
  return { get: (k) => map.get(k) ?? null, set: (k, v) => void map.set(k, v) }
}

function setup(options: {
  seed?: Record<string, string>
  confirm?: ConfirmChoice
  pickToOpen?: string | null
  pickToSave?: string | null
} = {}) {
  const fs = createMemoryFileSystem(options.seed ?? {})
  let clock = Date.parse('2026-09-04T10:00:00.000Z')
  const now = () => new Date(clock)

  const editors: ReturnType<typeof fakeEditor>[] = []
  const alert = vi.fn(async () => {})
  const confirm = vi.fn(async () => options.confirm ?? 'cancel')
  const closeWindow = vi.fn(async () => {})

  const dialog = {
    pickFileToOpen: async () => options.pickToOpen ?? null,
    pickFileToSave: async () => options.pickToSave ?? null,
    alert,
  }

  const workspace = createWorkspace({
    files: createFileService(fs, dialog),
    history: createHistory(fs, { now }),
    recent: createRecentFiles(memoryStore()),
    pickFileToOpen: dialog.pickFileToOpen,
    alert,
    confirm,
    mountEditor: async (_root, markdown) => {
      const fake = fakeEditor()
      fake.setContent(markdown)
      editors.push(fake)
      return fake.editor
    },
    closeWindow,
    now,
  })

  return {
    fs,
    workspace,
    alert,
    confirm,
    closeWindow,
    editors,
    current: () => editors[editors.length - 1]!,
    advance: (ms: number) => {
      clock += ms
    },
    start: () => workspace.start(document.createElement('div')),
  }
}

describe('工作区 · 保存', () => {
  it('⌘S 把编辑器里的内容写回当前文件', async () => {
    const t = setup({ seed: { '/notes/a.md': '旧' }, pickToOpen: '/notes/a.md' })
    await t.start()
    await t.workspace.openPath('/notes/a.md')
    t.current().type('新内容')

    await t.workspace.run('save')

    expect(t.fs.files.get('/notes/a.md')).toBe('新内容')
    expect(t.workspace.dirty.value).toBe(false)
  })

  it('从未保存过的文档，⌘S 走另存为并记住新路径', async () => {
    const t = setup({ pickToSave: '/notes/新建.md' })
    await t.start()
    t.current().type('内容')

    await t.workspace.run('save')

    expect(t.workspace.currentPath.value).toBe('/notes/新建.md')
    expect(t.fs.files.get('/notes/新建.md')).toBe('内容')
  })

  it('写入失败时脏标记不清零，并告知用户', async () => {
    const t = setup({ seed: { '/notes/a.md': '旧' } })
    await t.start()
    await t.workspace.openPath('/notes/a.md')
    t.current().type('新内容')
    t.fs.writeTextFile = async () => {
      throw new Error('EACCES')
    }

    await t.workspace.run('save')

    expect(t.workspace.dirty.value).toBe(true)
    expect(t.alert).toHaveBeenCalled()
  })

  it('保存进行中再次 ⌘S 不会并发写入', async () => {
    const t = setup({ seed: { '/notes/a.md': '旧' } })
    await t.start()
    await t.workspace.openPath('/notes/a.md')
    t.current().type('新内容')

    let writes = 0
    const original = t.fs.writeTextFile
    t.fs.writeTextFile = async (path, contents) => {
      if (path === '/notes/a.md') writes++
      await new Promise((r) => setTimeout(r, 10))
      await original(path, contents)
    }

    await Promise.all([t.workspace.run('save'), t.workspace.run('save')])

    expect(writes).toBe(1)
  })

  it('历史写入失败不影响保存成功，但会告知用户', async () => {
    const t = setup({ pickToSave: '/notes/a.md' })
    await t.start()
    t.current().type('内容')
    const original = t.fs.writeTextFile
    t.fs.writeTextFile = async (path, contents) => {
      if (path.includes('.milktown')) throw new Error('EACCES')
      await original(path, contents)
    }

    await t.workspace.run('save')

    expect(t.workspace.dirty.value).toBe(false)
    expect(t.fs.files.get('/notes/a.md')).toBe('内容')
    expect(t.alert).toHaveBeenCalled()
  })
})

describe('工作区 · 留存时机', () => {
  it('打开文件不写盘——用户目录里不会凭空出现 .milktown', async () => {
    const t = setup({ seed: { '/notes/a.md': '正文' } })
    await t.start()

    await t.workspace.openPath('/notes/a.md')

    expect([...t.fs.files.keys()]).toEqual(['/notes/a.md'])
    expect([...t.fs.dirs]).toEqual([])
  })

  it('第一次保存补写「打开时那一版」，时间戳归打开那一刻', async () => {
    const t = setup({ seed: { '/notes/a.md': '打开时的样子' } })
    await t.start()
    await t.workspace.openPath('/notes/a.md')
    t.advance(30 * 60_000)
    t.current().type('改过之后')

    await t.workspace.run('save')

    const history = createHistory(t.fs, { now: () => new Date() })
    const versions = await history.list('/notes/a.md')
    expect(versions).toHaveLength(2)
    expect(await history.read(versions[0]!)).toBe('改过之后')
    expect(await history.read(versions[1]!)).toBe('打开时的样子')
    expect(versions[1]!.savedAt.toISOString()).toBe('2026-09-04T10:00:00.000Z')
  })

  it('打开后一个字没改就保存，只留一版', async () => {
    const t = setup({ seed: { '/notes/a.md': '正文' } })
    await t.start()
    await t.workspace.openPath('/notes/a.md')

    await t.workspace.run('save')

    const history = createHistory(t.fs, { now: () => new Date() })
    expect(await history.list('/notes/a.md')).toHaveLength(1)
  })

  it('关闭时留一版——但只在这个文件已经有历史的时候', async () => {
    const t = setup({ seed: { '/notes/a.md': '正文' }, confirm: 'discard' })
    await t.start()
    await t.workspace.openPath('/notes/a.md')
    t.current().type('改了但不保存')

    await t.workspace.requestClose()

    // 从没保存过，历史目录不存在：关窗不该凭空建目录。
    expect([...t.fs.files.keys()]).toEqual(['/notes/a.md'])
  })

  it('已经有历史的文件，关窗会把未保存的内容也留一版', async () => {
    const t = setup({ seed: { '/notes/a.md': '正文' }, confirm: 'discard' })
    await t.start()
    await t.workspace.openPath('/notes/a.md')
    t.current().type('第一次改动')
    await t.workspace.run('save')
    t.advance(60_000)
    t.current().type('关窗前的改动')

    await t.workspace.requestClose()

    const history = createHistory(t.fs, { now: () => new Date() })
    const contents = await Promise.all(
      (await history.list('/notes/a.md')).map(history.read)
    )
    expect(contents).toContain('关窗前的改动')
  })
})

describe('工作区 · 关窗与确认', () => {
  it('干净文档关窗不问，直接关', async () => {
    const t = setup()
    await t.start()

    await t.workspace.requestClose()

    expect(t.confirm).not.toHaveBeenCalled()
    expect(t.closeWindow).toHaveBeenCalled()
  })

  it('脏文档选「取消」时窗口不关', async () => {
    const t = setup({ confirm: 'cancel' })
    await t.start()
    t.current().type('写了一半')

    await t.workspace.requestClose()

    expect(t.closeWindow).not.toHaveBeenCalled()
  })

  it('脏文档选「不保存」时直接关，内容不落盘', async () => {
    const t = setup({ confirm: 'discard' })
    await t.start()
    t.current().type('写了一半')

    await t.workspace.requestClose()

    expect(t.closeWindow).toHaveBeenCalled()
    expect(t.fs.files.size).toBe(0)
  })

  it('脏文档选「保存」时先落盘再关', async () => {
    const t = setup({ confirm: 'save', pickToSave: '/notes/新建.md' })
    await t.start()
    t.current().type('写了一半')

    await t.workspace.requestClose()

    expect(t.fs.files.get('/notes/新建.md')).toBe('写了一半')
    expect(t.closeWindow).toHaveBeenCalled()
  })

  it('选「保存」但保存被取消时，窗口不关', async () => {
    const t = setup({ confirm: 'save', pickToSave: null })
    await t.start()
    t.current().type('写了一半')

    await t.workspace.requestClose()

    expect(t.closeWindow).not.toHaveBeenCalled()
    expect(t.workspace.dirty.value).toBe(true)
  })

  it('脏文档打开另一个文件时先确认', async () => {
    const t = setup({ seed: { '/notes/b.md': 'B' }, confirm: 'cancel' })
    await t.start()
    t.current().type('写了一半')

    await t.workspace.openPath('/notes/b.md')

    expect(t.confirm).toHaveBeenCalled()
    expect(t.workspace.currentPath.value).toBeNull()
  })
})

describe('工作区 · 打开与最近文件', () => {
  it('打开会重建编辑器实例，撤销历史随之清空', async () => {
    const t = setup({ seed: { '/notes/a.md': '正文' } })
    await t.start()
    const first = t.current()

    await t.workspace.openPath('/notes/a.md')

    expect(first.destroyed).toBe(1)
    expect(t.editors).toHaveLength(2)
    expect(t.workspace.words.value).toBe(2)
  })

  it('打开失败时把它从最近文件里移除，并告知用户', async () => {
    const t = setup()
    await t.start()
    await t.workspace.openPath('/notes/不存在.md')

    expect(t.alert).toHaveBeenCalled()
    expect(t.workspace.recentList.value).toEqual([])
    expect(t.workspace.currentPath.value).toBeNull()
  })

  it('打开过的文件进最近文件列表，⌘O 面板里能选中并打开', async () => {
    const t = setup({ seed: { '/notes/a.md': '正文' } })
    await t.start()
    await t.workspace.openPath('/notes/a.md')
    await t.workspace.run('new')

    await t.workspace.run('recent.toggle')
    expect(t.workspace.recentOpen.value).toBe(true)
    await t.workspace.run('recent.open')

    expect(t.workspace.currentPath.value).toBe('/notes/a.md')
    expect(t.workspace.recentOpen.value).toBe(false)
  })
})

describe('工作区 · 双页视图与还原', () => {
  it('没有路径时进双页视图只给说明，不打开', async () => {
    const t = setup()
    await t.start()

    await t.workspace.run('diff.open')

    expect(t.workspace.diffOpen.value).toBe(false)
    expect(t.alert).toHaveBeenCalled()
  })

  it('选中版本后立刻显示它与当前内容的差异', async () => {
    const t = setup({ seed: { '/notes/a.md': '第一行' } })
    await t.start()
    await t.workspace.openPath('/notes/a.md')
    t.current().type('第一行\n第二行')
    await t.workspace.run('save')
    t.advance(10 * 60_000)
    t.current().type('第一行\n第二行\n第三行')

    await t.workspace.run('diff.open')

    expect(t.workspace.versions.value.length).toBeGreaterThan(0)
    expect(t.workspace.diff.value.some((line) => line.kind === 'added')).toBe(true)
  })

  it('还原把版本装回编辑器，文档变脏，磁盘上的文件没被改写', async () => {
    const t = setup({ seed: { '/notes/a.md': '原样' } })
    await t.start()
    await t.workspace.openPath('/notes/a.md')
    t.current().type('第一次改动')
    await t.workspace.run('save')
    t.advance(10 * 60_000)
    t.current().type('第二次改动')
    await t.workspace.run('save')

    await t.workspace.run('diff.open')
    await t.workspace.selectVersion(t.workspace.versions.value.length - 1)
    await t.workspace.restoreVersion()

    expect(t.current().editor.read()).toBe('原样')
    expect(t.workspace.dirty.value).toBe(true)
    expect(t.fs.files.get('/notes/a.md')).toBe('第二次改动')
    expect(t.workspace.diffOpen.value).toBe(false)
  })

  it('还原后的第一次保存必定留下新版本', async () => {
    const t = setup({ seed: { '/notes/a.md': '原样' } })
    await t.start()
    await t.workspace.openPath('/notes/a.md')
    t.current().type('改动')
    await t.workspace.run('save')

    await t.workspace.run('diff.open')
    await t.workspace.selectVersion(t.workspace.versions.value.length - 1)
    await t.workspace.restoreVersion()
    const before = t.workspace.versions.value.length
    await t.workspace.run('save') // 距上一版不足 5 分钟，本来会被覆盖

    const history = createHistory(t.fs, { now: () => new Date() })
    expect((await history.list('/notes/a.md')).length).toBeGreaterThan(before)
  })
})

describe('工作区 · 字数', () => {
  it('字数随输入更新，数的是正文', async () => {
    const t = setup()
    await t.start()

    t.current().type('今天写了三行字')

    expect(t.workspace.words.value).toBe(7)
  })
})

describe('工作区 · 源码模式', () => {
  it('⌘/ 把文档从编辑器交给文本区，编辑器实例被销毁', async () => {
    const t = setup()
    await t.start()
    t.current().type('# 标题\n')
    const editorCount = t.editors.length

    await t.workspace.run('source.toggle')

    expect(t.workspace.sourceMode.value).toBe(true)
    expect(t.workspace.sourceText.value).toBe('# 标题\n')
    expect(t.current().destroyed).toBe(1)
    expect(t.editors.length).toBe(editorCount) // 没有第二个持有方
  })

  it('⌘/ 退出时文本区的内容装回新的编辑器实例', async () => {
    const t = setup()
    await t.start()
    await t.workspace.run('source.toggle')
    t.workspace.editSource('原文一行')

    await t.workspace.run('source.toggle')

    expect(t.workspace.sourceMode.value).toBe(false)
    expect(t.current().editor.read()).toBe('原文一行')
  })

  it('纯粹的模式切换不置脏', async () => {
    const t = setup({ seed: { '/a.md': '# 标题\n' } })
    await t.start()
    await t.workspace.openPath('/a.md')

    await t.workspace.run('source.toggle')
    expect(t.workspace.dirty.value).toBe(false)
    await t.workspace.run('source.toggle')
    expect(t.workspace.dirty.value).toBe(false)
  })

  it('文本区的输入置脏，与编辑器的文档变更事件同级', async () => {
    const t = setup()
    await t.start()
    await t.workspace.run('source.toggle')

    t.workspace.editSource('敲了字')

    expect(t.workspace.dirty.value).toBe(true)
  })

  it('源码模式的 ⌘S 写出文本区里的原文，不经过规范化', async () => {
    const t = setup({ seed: { '/a.md': '# 标题\n' } })
    await t.start()
    await t.workspace.openPath('/a.md')
    await t.workspace.run('source.toggle')
    // 假编辑器不做规范化；这里的原文是编辑器绝不会产出的写法。
    t.workspace.editSource('#    标题   \n\n\n\n随手写的')

    await t.workspace.run('save')

    expect(t.fs.files.get('/a.md')).toBe('#    标题   \n\n\n\n随手写的')
    expect(t.workspace.dirty.value).toBe(false)
  })

  it('字数在 ⌘/ 前后不跳变，数的都是原文字符数', async () => {
    const t = setup()
    await t.start()
    t.current().type('  # 标题\n')
    expect(t.workspace.words.value).toBe(4)

    await t.workspace.run('source.toggle')

    expect(t.workspace.words.value).toBe(4)
  })

  it('⌘F 在写作视图先切进源码模式，再开查找条', async () => {
    const t = setup()
    await t.start()

    await t.workspace.run('find.open')

    expect(t.workspace.sourceMode.value).toBe(true)
    expect(t.workspace.findOpen.value).toBe(true)
  })

  it('⇧⌘H 在源码模式下先退回写作视图', async () => {
    const t = setup({ seed: { '/a.md': '一' } })
    await t.start()
    await t.workspace.openPath('/a.md')
    await t.workspace.run('save')
    await t.workspace.run('source.toggle')

    await t.workspace.run('diff.open')

    expect(t.workspace.sourceMode.value).toBe(false)
    expect(t.workspace.diffOpen.value).toBe(true)
  })

  it('退出源码模式时查找条一并关掉', async () => {
    const t = setup()
    await t.start()
    await t.workspace.run('find.open')

    await t.workspace.run('source.toggle')

    expect(t.workspace.findOpen.value).toBe(false)
  })
})
