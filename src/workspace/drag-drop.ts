import { fileNameOf } from '../files/file-service'
import { extensionOf, isOpenable } from '../files/openable'

/** 拖拽悬停时覆盖层上说的话（设计 2c）。`null` 表示不显示覆盖层。 */
export interface DropHint {
  /** 松手会不会打开文件。false 时文字转 --muted，松手无动作。 */
  ok: boolean
  line: string
  /** 文件名单独出来，因为它带 --highlight 底色。 */
  name?: string
  /** 当前文档是脏的时候多出的第二行。预告只说会问，不替用户做决定。 */
  warn?: string
}

export function describeDrop(paths: string[], dirty: boolean, fileName: string): DropHint | null {
  const first = paths[0]
  if (!first) return null

  if (!isOpenable(first)) {
    const ext = extensionOf(first)
    return { ok: false, line: `不认识 ${ext ? `.${ext}` : '这种文件'}` }
  }

  const name = fileNameOf(first)
  return {
    ok: true,
    line: paths.length > 1 ? '只能打开一个 · 松手取第一个' : '在此打开',
    name,
    warn: dirty ? `${fileName} 有未保存修改，松手后先问你` : undefined,
  }
}
