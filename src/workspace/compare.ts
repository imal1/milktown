/**
 * 双页视图两栏的内容模型。纯函数：不碰 DOM、不碰编辑器、不读盘，所以
 * 「哪一栏画什么」这件事能在 node 环境里断言。
 *
 * 三个双页视图共用一条真相源规矩（ADR 0015）；这里管的是更小的一件事——
 * 进去之后左右两栏各是什么，以及计数条上那句话。
 */
import type { DocumentBlock } from '../editor/editor'
import type { DiffLine } from '../history/line-diff'

/** 一栏里的一格。`blank` 是对面有、这边没有时的占位。 */
export interface ComparePane {
  /** 排版后的 HTML。有它就渲染它，否则渲染 `text`。 */
  html?: string
  text: string
  kind: 'same' | 'added' | 'removed' | 'blank'
}

export interface CompareRow {
  left: ComparePane
  right: ComparePane
}

/** 原文对照：左边排版后的块，右边同一个块的原文。一行一个块。 */
export function plainRows(blocks: DocumentBlock[]): CompareRow[] {
  return blocks.map((block) => ({
    left: { html: block.html, text: block.markdown, kind: 'same' },
    right: { text: block.markdown, kind: 'same' },
  }))
}

/**
 * 磁盘对照：左边磁盘上那份，右边当前这份。删掉的行只在左边、加上的行只在
 * 右边，对面留空——两栏的行数因此始终相等，滚动时不会脱节。
 */
export function diskRows(diff: DiffLine[]): CompareRow[] {
  return diff.map((line) => ({
    left:
      line.kind === 'added' ? { text: '', kind: 'blank' } : { text: line.text, kind: line.kind },
    right:
      line.kind === 'removed' ? { text: '', kind: 'blank' } : { text: line.text, kind: line.kind },
  }))
}

/**
 * 计数条上那句话。
 *
 * 「没有改动」是一句真话，不是功能坏了——有文件但不脏时照样进得来，看到的
 * 就是这句（#25）。
 */
export function describeChanges(diff: DiffLine[]): string {
  const added = diff.filter((line) => line.kind === 'added').length
  const removed = diff.filter((line) => line.kind === 'removed').length
  if (added === 0 && removed === 0) return '没有改动'
  return `${added} 行新增 · ${removed} 行删除`
}
