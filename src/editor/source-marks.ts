import type { Mark, Node, ResolvedPos } from '@milkdown/kit/prose/model'
import type { EditorState, Transaction } from '@milkdown/kit/prose/state'
import { Plugin, PluginKey } from '@milkdown/kit/prose/state'
import type { EditorView } from '@milkdown/kit/prose/view'
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view'

/**
 * 光标进到哪一段，那一段的 Markdown 标记就显出来（ADR 0014）。
 *
 * 标记是 widget decoration——画在文档上面，不在文档里。所以它们不进
 * `read()`、不进剪贴板、不算进字数，靠的是「本来就不是内容」，不是靠事后过滤。
 *
 * 粒度是段，不是视觉行：ProseMirror 认的单位是块，一个段落在纸上会折成好几行，
 * 按视觉行做要自己算每行位置，折行处标记还会跳。
 */

/** 行首那些标记，悬挂在纸外，不占正文的位置。 */
const LEAD = 'milktown-mark milktown-mark-lead'
/** 行内那些标记，占位置，把当前段推开。 */
const INLINE = 'milktown-mark'

/**
 * 不显的三样：代码围栏、表格、图片。
 *
 * 它们的标记比它们标的内容还长，显出来纸面会散架；而且这三样各自已经有跟着
 * 内容走的控件了，不缺入口。
 */
const OPAQUE = new Set(['code_block', 'table', 'table_row', 'table_cell', 'table_header'])

/** 行内标记的两头。`link` 的右半边要带上地址，所以是函数不是常量。 */
const INLINE_MARKS: Record<string, (mark: Mark) => [string, string]> = {
  strong: () => ['**', '**'],
  emphasis: () => ['*', '*'],
  inlineCode: () => ['`', '`'],
  strike_through: () => ['~~', '~~'],
  link: (mark) => ['[', `](${String(mark.attrs.href ?? '')})`],
}

function markElement(text: string, className: string): HTMLElement {
  const span = document.createElement('span')
  span.className = className
  span.textContent = text
  // 光标不许落进来：它不是文档的一部分，选中它没有意义。
  span.setAttribute('contenteditable', 'false')
  return span
}

function widget(pos: number, text: string, className: string, side: number): Decoration {
  return Decoration.widget(pos, () => markElement(text, className), {
    side,
    // 不继承周围的 mark，否则粗体里的 `**` 自己也会被画成粗体。
    marks: [],
  })
}

/**
 * 行首标记：从最外层的祖先往里数，引用、列表、标题依次拼起来。
 * 引用里的一条有序列表项标题会得到 `> 2. ##`——和原文里的写法同序。
 */
function leadingMark($from: ResolvedPos, depth: number): string {
  const parts: string[] = []
  for (let level = 1; level <= depth; level++) {
    const node = $from.node(level)
    if (node.type.name === 'blockquote') parts.push('>')
    if (node.type.name !== 'list_item') continue
    const list = $from.node(level - 1)
    if (list.type.name === 'ordered_list') {
      parts.push(`${Number(list.attrs.order ?? 1) + $from.index(level - 1)}.`)
    } else {
      parts.push('-')
    }
  }
  const block = $from.node(depth)
  if (block.type.name === 'heading') parts.push('#'.repeat(Number(block.attrs.level ?? 1)))
  return parts.join(' ')
}

/** 行内标记：沿着这一段的子节点走，某个 mark 开了就补左半边，关了就补右半边。 */
function inlineMarks(block: Node, start: number): Decoration[] {
  const out: Decoration[] = []
  let open: readonly Mark[] = []
  let pos = start

  const close = (marks: readonly Mark[], at: number) => {
    // 倒着关：先开的后关，`**~~字~~**` 才不会写成 `**~~字**~~`。
    for (let i = marks.length - 1; i >= 0; i--) {
      const mark = marks[i]
      if (!mark) continue
      const pair = INLINE_MARKS[mark.type.name]
      if (pair) out.push(widget(at, pair(mark)[1], INLINE, -1))
    }
  }

  block.forEach((child) => {
    const marks = child.marks
    close(
      open.filter((mark) => !mark.isInSet(marks)),
      pos
    )
    for (const mark of marks) {
      if (mark.isInSet(open)) continue
      const pair = INLINE_MARKS[mark.type.name]
      if (pair) out.push(widget(pos, pair(mark)[0], INLINE, 1))
    }
    // 行内公式在文档里是一个节点，不是 mark——两头各补一个 `$`。
    if (child.type.name === 'math_inline') {
      out.push(widget(pos, '$', INLINE, 1))
      out.push(widget(pos + child.nodeSize, '$', INLINE, -1))
    }
    open = marks
    pos += child.nodeSize
  })

  close(open, pos)
  return out
}

function decorationsFor(state: EditorState): DecorationSet {
  const { $from } = state.selection
  let depth = $from.depth
  while (depth > 0 && !$from.node(depth).isTextblock) depth--
  const block = $from.node(depth)
  if (!block.isTextblock || OPAQUE.has(block.type.name)) return DecorationSet.empty
  for (let level = depth - 1; level > 0; level--) {
    if (OPAQUE.has($from.node(level).type.name)) return DecorationSet.empty
  }

  const start = $from.start(depth)
  const decorations = inlineMarks(block, start)
  const lead = leadingMark($from, depth)
  if (lead !== '') decorations.push(widget(start, lead, LEAD, -1))
  return DecorationSet.create(state.doc, decorations)
}

export const sourceMarksKey = new PluginKey<DecorationSet>('milktown-source-marks')

/**
 * 插件加上一个开关：输入法合成期间不重算标记。
 *
 * 候选框还开着的时候纸面不许动，否则拼音串每敲一下都在推挤当前段，中文根本
 * 没法写。合成结束那一下不用自己重画——合成的文本会以一个事务落进来，标记
 * 跟着那次 `apply` 就回来了。
 */
export function createSourceMarks(): {
  plugin: Plugin
  setComposing: (composing: boolean) => void
} {
  let composing = false
  return {
    setComposing: (next) => {
      composing = next
    },
    plugin: new Plugin<DecorationSet>({
      key: sourceMarksKey,
      state: {
        init: (_config, state) => decorationsFor(state),
        apply: (tr: Transaction, value: DecorationSet, _old, state) => {
          if (composing) return value.map(tr.mapping, tr.doc)
          const asked = tr.getMeta(sourceMarksKey) === true
          if (!asked && !tr.docChanged && !tr.selectionSet) return value
          return decorationsFor(state)
        },
      },
      props: {
        decorations: (state) => sourceMarksKey.getState(state),
      },
    }),
  }
}

/** 让插件重算一次。合成被取消时没有后续事务，靠它把标记接回来。 */
export function refreshSourceMarks(view: EditorView) {
  view.dispatch(view.state.tr.setMeta(sourceMarksKey, true))
}
