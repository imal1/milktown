import { invoke } from '@tauri-apps/api/core'

/**
 * 一个窗口一个文档（ADR 0011）。「哪个窗口装着哪个文件」这份注册表在
 * Rust 那边，因为只有它能开窗口、能聚焦窗口。这是它的端口。
 */
/** 网页启动时向 Rust 问的那一次。 */
export interface BootInput {
  /** 这个窗口被指派装的文件。 */
  path: string | null
  /** 这个窗口被指派恢复的草稿。 */
  draft: string | null
  /** 启动参数带进来的路径，只有最先启动的那个窗口拿得到。 */
  startupPaths: string[]
}

export interface WindowsPort {
  /** 本窗口装什么，以及启动参数带进来了什么。每个窗口只问一次。 */
  boot: () => Promise<BootInput>
  /** 告诉注册表本窗口现在装着哪个文件。`null` 表示手上没有文件。 */
  claim: (path: string | null) => Promise<void>
  /** 这个文件已经在别的窗口开着的话，静默聚焦那个窗口并返回 true。 */
  focusIfOpen: (path: string) => Promise<boolean>
  /** 每个文件各开一个新窗口；已经开着的那些只聚焦，不开第二个。 */
  openFiles: (paths: string[]) => Promise<void>
  /** 每份草稿各开一个新窗口。 */
  openDrafts: (ids: string[]) => Promise<void>
}

/** 浏览器里跑（vite dev）时没有 Rust 那一侧，静默降级成单窗口。 */
async function call<T>(command: string, args: Record<string, unknown>, fallback: T): Promise<T> {
  try {
    return await invoke<T>(command, args)
  } catch {
    return fallback
  }
}

const ALONE: BootInput = { path: null, draft: null, startupPaths: [] }

export const tauriWindows: WindowsPort = {
  boot: () => call('boot', {}, ALONE),
  claim: async (path) => void (await call('claim', { path }, null)),
  focusIfOpen: (path) => call('focus_path', { path }, false),
  openFiles: async (paths) => void (await call('open_files', { paths }, null)),
  openDrafts: async (ids) => void (await call('open_drafts', { ids }, null)),
}
