/**
 * 认哪些后缀（ADR 0011）。拖拽悬停判定与命令行参数判定都问这里，
 * 只有一份清单。`tauri.conf.json` 的文件关联故意只注册 `.md`——
 * 关联是抢占，拖拽是用户当场的明确意图。
 */
export const OPENABLE_EXTENSIONS = ['md', 'markdown', 'mdown', 'mkd', 'txt']

/** 末尾的后缀，不含点、小写。`.gitignore` 这种纯点开头的当作没有后缀。 */
export function extensionOf(path: string): string {
  const name = path.split(/[/\\]/).pop() ?? ''
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export function isOpenable(path: string): boolean {
  return OPENABLE_EXTENSIONS.includes(extensionOf(path))
}
