/** 文件模块依赖的两个端口。测试里换成内存实现，生产里换成 Tauri 插件。 */

export interface FileSystemPort {
  readTextFile: (path: string) => Promise<string>
  writeTextFile: (path: string, contents: string) => Promise<void>
  mkdir: (path: string) => Promise<void>
  readDir: (path: string) => Promise<string[]>
  remove: (path: string) => Promise<void>
  exists: (path: string) => Promise<boolean>
}

export interface DialogPort {
  /** 系统原生打开对话框，取消时返回 null。 */
  pickFileToOpen: () => Promise<string | null>
  /** 系统原生保存对话框，取消时返回 null。 */
  pickFileToSave: (defaultName: string) => Promise<string | null>
  /** 是 / 否确认框。 */
  confirm: (message: string) => Promise<boolean>
  /** 出错时的提示框。 */
  alert: (message: string) => Promise<void>
}

/** 时钟端口。历史模块不直接读系统时间，测试用可控时钟。 */
export interface ClockPort {
  now: () => Date
}
