import type { DialogPort, FileSystemPort } from './ports'

export interface OpenedFile {
  path: string
  content: string
}

export interface FileService {
  /** 弹出系统对话框选文件并读取。用户取消返回 null；读取失败抛出。 */
  open: () => Promise<OpenedFile | null>
  /** 按路径读取。失败时抛出带路径的错误。 */
  read: (path: string) => Promise<OpenedFile>
  /** 写回已有路径。失败抛出。 */
  save: (path: string, content: string) => Promise<void>
  /** 弹出保存对话框，写入用户选的新路径并返回它。用户取消返回 null。 */
  saveAs: (content: string, defaultName: string) => Promise<string | null>
}

export function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

export function dirNameOf(path: string): string {
  const parts = path.split(/[\\/]/)
  parts.pop()
  return parts.join('/') || '/'
}

export function createFileService(
  fs: FileSystemPort,
  dialog: DialogPort
): FileService {
  const read = async (path: string): Promise<OpenedFile> => {
    try {
      return { path, content: await fs.readTextFile(path) }
    } catch (cause) {
      throw new Error(`无法读取 ${path}：文件不存在，或没有读取权限`, { cause })
    }
  }

  return {
    read,

    open: async () => {
      const path = await dialog.pickFileToOpen()
      if (!path) return null
      return read(path)
    },

    save: async (path, content) => {
      try {
        await fs.writeTextFile(path, content)
      } catch (cause) {
        throw new Error(`无法写入 ${path}：没有写入权限，或磁盘已满`, { cause })
      }
    },

    saveAs: async (content, defaultName) => {
      const path = await dialog.pickFileToSave(defaultName)
      if (!path) return null
      try {
        await fs.writeTextFile(path, content)
      } catch (cause) {
        throw new Error(`无法写入 ${path}：没有写入权限，或磁盘已满`, { cause })
      }
      return path
    },
  }
}
