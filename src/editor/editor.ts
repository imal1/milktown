import { Crepe } from '@milkdown/crepe'
import { editorViewOptionsCtx } from '@milkdown/kit/core'
import { remarkStringifyOptionsCtx } from '@milkdown/kit/core'

import { markdownStyle } from './markdown-style'

/**
 * 编辑器封装。对外只有四件事：挂载、销毁、取出当前 Markdown、订阅文档变更。
 * Crepe 实例不外泄（ADR 0002：编辑器是文档的唯一真相源）。
 */
export interface DocumentEditor {
  destroy: () => Promise<void>
  getMarkdown: () => string
  onChange: (fn: (markdown: string) => void) => void
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
    listener.markdownUpdated((_ctx, markdown) => {
      for (const fn of listeners) fn(markdown)
    })
  })

  await crepe.create()

  return {
    destroy: async () => {
      await crepe.destroy()
    },
    getMarkdown: () => crepe.getMarkdown(),
    onChange: (fn) => {
      listeners.push(fn)
    },
  }
}
