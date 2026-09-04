import { message, open, save } from '@tauri-apps/plugin-dialog'
import {
  exists,
  mkdir,
  readDir,
  readTextFile,
  remove,
  writeTextFile,
} from '@tauri-apps/plugin-fs'

import type { DialogPort, FileSystemPort } from './ports'

export const tauriFileSystem: FileSystemPort = {
  readTextFile: (path) => readTextFile(path),
  writeTextFile: (path, contents) => writeTextFile(path, contents),
  mkdir: (path) => mkdir(path, { recursive: true }),
  readDir: async (path) => (await readDir(path)).filter((e) => e.isFile).map((e) => e.name),
  remove: (path) => remove(path),
  exists: (path) => exists(path),
}

export const tauriDialog: DialogPort = {
  pickFileToOpen: async () => {
    const picked = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
    })
    return typeof picked === 'string' ? picked : null
  },
  pickFileToSave: async (defaultName) => {
    const picked = await save({
      defaultPath: defaultName,
      filters: [{ name: 'Markdown', extensions: ['md'] }],
    })
    return picked ?? null
  },
  alert: async (text) => {
    await message(text, { title: 'milktown', kind: 'error' })
  },
}
