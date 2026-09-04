import { Crepe } from '@milkdown/crepe'
import {
  editorViewCtx,
  editorViewOptionsCtx,
  remarkStringifyOptionsCtx,
  serializerCtx,
} from '@milkdown/kit/core'
import { Fragment, type Node } from '@milkdown/kit/prose/model'
import type { EditorView } from '@milkdown/kit/prose/view'

import { markdownStyle } from './markdown-style'

/** 按键的修饰键。名字对齐 `KeyboardEvent`。 */
export interface Modifiers {
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
}

/**
 * 编辑器封装。对外是用户层面的动作：挂载、销毁、取出当前文档、订阅文档变更，
 * 以及像用户那样打字与按键。取出的是规范化后的 Markdown 源码——保存写的就是它。
 * Crepe 与 ProseMirror 的实例不外泄（ADR 0002：编辑器是文档的唯一真相源）。
 */
export interface DocumentEditor {
  destroy: () => Promise<void>
  read: () => string
  onChange: (fn: (markdown: string) => void) => void
  /** 像用户那样逐字键入：走输入规则，所以 `# ` 会变成标题。 */
  type: (text: string) => void
  /** 像用户那样按一个键：走 keymap，所以 Enter 会分段、⌘Z 会撤销。 */
  press: (key: string, modifiers?: Modifiers) => void
}

export async function mountEditor(
  root: HTMLElement,
  markdown: string
): Promise<DocumentEditor> {
  const listeners: ((markdown: string) => void)[] = []

  const crepe = new Crepe({
    root,
    defaultValue: markdown,
    features: {
      [Crepe.Feature.BlockEdit]: true,
      [Crepe.Feature.Toolbar]: true,
      [Crepe.Feature.CodeMirror]: true,
      [Crepe.Feature.Table]: true,
      [Crepe.Feature.ImageBlock]: true,
      [Crepe.Feature.LinkTooltip]: true,
      [Crepe.Feature.ListItem]: true,
      [Crepe.Feature.Latex]: true,
      [Crepe.Feature.Placeholder]: true,
      [Crepe.Feature.Cursor]: true,
    },
    featureConfigs: {
      [Crepe.Feature.Placeholder]: { text: '开始写' },
    },
  })

  crepe.editor.config((ctx) => {
    ctx.set(remarkStringifyOptionsCtx, { ...markdownStyle })
    ctx.update(editorViewOptionsCtx, (prev) => ({
      ...prev,
      attributes: { class: 'milktown-prose', spellcheck: 'false' },
    }))
  })

  crepe.on((listener) => {
    listener.markdownUpdated((_ctx, updated) => {
      for (const fn of listeners) fn(updated)
    })
  })

  await crepe.create()

  /** 借一下视图。ProseMirror 的对象只在这个文件里出现。 */
  function withView(fn: (view: EditorView) => void) {
    crepe.editor.action((ctx) => fn(ctx.get(editorViewCtx)))
  }

  /**
   * 取出文档时先去掉顶层的空段落。
   *
   * Markdown 里没有「空段落」这个东西——连续空行只是块之间的分隔。但编辑器
   * 里有：按两次 Enter 留出的空行、列表或引用后面那个用来落光标的尾块，都是
   * 货真价实的空段落节点。直接序列化，前者会写出字面的 `<br />`，后者会在
   * 文件末尾多一个换行，两者都会让保存出来的文本不再是规范化文本（ADR 0006）。
   *
   * 各层都清，但不把一个容器清空：空列表项要靠里面那个空段落才写得出来。
   */
  function withoutEmptyParagraphs(node: Node): Node {
    const kept: Node[] = []
    node.forEach((child) => {
      if (child.type.name === 'paragraph' && child.content.size === 0) return
      kept.push(child.isBlock ? withoutEmptyParagraphs(child) : child)
    })
    // 清空了整个容器就不清——空列表项要留住里面那个空段落才写得出来。
    return kept.length === 0 && node.childCount > 0 ? node : node.copy(Fragment.fromArray(kept))
  }

  return {
    destroy: async () => {
      await crepe.destroy()
    },
    read: () => {
      let markdown = ''
      crepe.editor.action((ctx) => {
        const doc = withoutEmptyParagraphs(ctx.get(editorViewCtx).state.doc)
        // 清完一个块都不剩，就是一份空文档——序列化器不接受空的顶层。
        if (doc.childCount === 0) return
        markdown = ctx.get(serializerCtx)(doc)
      })
      return markdown
    },
    onChange: (fn) => {
      listeners.push(fn)
    },
    type: (text) =>
      withView((view) => {
        for (const char of text) {
          const { from, to } = view.state.selection
          // 先问输入规则要不要接管这一个字符；不接管才走普通插入。
          const handled = view.someProp('handleTextInput', (fn) =>
            fn(view, from, to, char, () => view.state.tr.insertText(char, from, to))
          )
          if (!handled) view.dispatch(view.state.tr.insertText(char, from, to))
        }
      }),
    press: (key, modifiers = {}) =>
      withView((view) => {
        // 真实浏览器里 ⇧⌘Z 的 `key` 是大写 Z，ProseMirror 靠 `keyCode` 回落到
        // 小写才对上绑定。合成事件不带 keyCode，这里得补上，否则 redo 对不上。
        const keyCode = key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0
        const event = new KeyboardEvent('keydown', { key, code: key, keyCode, ...modifiers })
        view.someProp('handleKeyDown', (fn) => fn(view, event))
      }),
  }
}
