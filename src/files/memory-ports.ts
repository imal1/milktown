import type { DialogPort, FileSystemPort } from './ports'

/** 内存文件系统。测试用，不触碰真实磁盘。 */
export function createMemoryFileSystem(
  seed: Record<string, string> = {}
): FileSystemPort & { files: Map<string, string>; dirs: Set<string> } {
  const files = new Map<string, string>(Object.entries(seed))
  const dirs = new Set<string>()

  return {
    files,
    dirs,
    readTextFile: async (path) => {
      const content = files.get(path)
      if (content === undefined) throw new Error(`ENOENT ${path}`)
      return content
    },
    writeTextFile: async (path, contents) => {
      files.set(path, contents)
    },
    mkdir: async (path) => {
      dirs.add(path)
    },
    readDir: async (path) => {
      if (!dirs.has(path)) throw new Error(`ENOENT ${path}`)
      const prefix = `${path}/`
      const names = new Set<string>()
      for (const file of files.keys()) {
        if (file.startsWith(prefix)) names.add(file.slice(prefix.length).split('/')[0]!)
      }
      return [...names]
    },
    remove: async (path) => {
      files.delete(path)
      dirs.delete(path)
    },
    exists: async (path) => files.has(path) || dirs.has(path),
  }
}

/** 脚本化的对话框。测试里预先说好用户会点什么。 */
export function createScriptedDialog(script: Partial<DialogPort> = {}): DialogPort {
  return {
    pickFileToOpen: async () => null,
    pickFileToSave: async () => null,
    confirm: async () => true,
    alert: async () => {},
    ...script,
  }
}
