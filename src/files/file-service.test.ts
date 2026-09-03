import { describe, expect, it } from 'vitest'

import { createFileService, dirNameOf, fileNameOf } from './file-service'
import { createMemoryFileSystem, createScriptedDialog } from './memory-ports'

describe('文件模块', () => {
  it('打开返回正确的路径与内容', async () => {
    const fs = createMemoryFileSystem({ '/notes/2026-09.md': '# 九月' })
    const service = createFileService(
      fs,
      createScriptedDialog({ pickFileToOpen: async () => '/notes/2026-09.md' })
    )

    expect(await service.open()).toEqual({ path: '/notes/2026-09.md', content: '# 九月' })
  })

  it('用户取消打开对话框时返回 null', async () => {
    const service = createFileService(createMemoryFileSystem(), createScriptedDialog())
    expect(await service.open()).toBeNull()
  })

  it('读取失败被抛出，且错误里带上文件路径', async () => {
    const service = createFileService(
      createMemoryFileSystem(),
      createScriptedDialog({ pickFileToOpen: async () => '/notes/没有这个.md' })
    )

    await expect(service.open()).rejects.toThrow('/notes/没有这个.md')
  })

  it('保存写到正确路径', async () => {
    const fs = createMemoryFileSystem({ '/notes/a.md': '旧' })
    const service = createFileService(fs, createScriptedDialog())

    await service.save('/notes/a.md', '新')

    expect(fs.files.get('/notes/a.md')).toBe('新')
  })

  it('未保存过的文档走另存为流程，返回用户选的新路径', async () => {
    const fs = createMemoryFileSystem()
    const service = createFileService(
      fs,
      createScriptedDialog({ pickFileToSave: async () => '/notes/新建.md' })
    )

    const path = await service.saveAs('内容', '未命名.md')

    expect(path).toBe('/notes/新建.md')
    expect(fs.files.get('/notes/新建.md')).toBe('内容')
  })

  it('用户取消保存对话框时不写入任何文件', async () => {
    const fs = createMemoryFileSystem()
    const service = createFileService(fs, createScriptedDialog())

    expect(await service.saveAs('内容', '未命名.md')).toBeNull()
    expect(fs.files.size).toBe(0)
  })

  it('写入失败被抛出', async () => {
    const fs = createMemoryFileSystem()
    fs.writeTextFile = async () => {
      throw new Error('EACCES')
    }
    const service = createFileService(fs, createScriptedDialog())

    await expect(service.save('/只读/a.md', 'x')).rejects.toThrow('/只读/a.md')
  })

  it('从路径拆出文件名与目录', () => {
    expect(fileNameOf('/notes/2026-09.md')).toBe('2026-09.md')
    expect(dirNameOf('/notes/2026-09.md')).toBe('/notes')
  })
})
