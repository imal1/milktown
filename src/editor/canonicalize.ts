import { Crepe } from '@milkdown/crepe'
import { parserCtx, remarkStringifyOptionsCtx, serializerCtx } from '@milkdown/kit/core'

import { markdownStyle } from './markdown-style'

/**
 * 规范化：文本 → 文档 → 文本。
 *
 * 用的是 Crepe 自己的 parser 与 serializer（不是裸 remark），因为要消除的
 * 正是 Crepe 自身的往返差异——别的工具算出的不动点不是同一个。
 *
 * 需要一个 DOM 环境：Milkdown 的 ctx 计时器依赖全局 addEventListener，
 * 编辑器实例也要挂到一个节点上。这个节点是游离的（不插入 document），
 * 因此不会出现在界面上。详见 docs/adr/0006 的补记。
 */
export interface Canonicalizer {
  canonicalize: (markdown: string) => string
  destroy: () => Promise<void>
}

export async function createCanonicalizer(): Promise<Canonicalizer> {
  const root = document.createElement('div')

  const crepe = new Crepe({ root, defaultValue: '' })
  crepe.editor.config((ctx) => {
    ctx.set(remarkStringifyOptionsCtx, { ...markdownStyle })
  })
  crepe.setReadonly(true)
  await crepe.create()

  return {
    canonicalize: (markdown: string) => {
      // 空文档解析出的空段落会被序列化成 `<br />`，那不是空文本。
      if (!markdown.trim()) return ''
      let out = ''
      crepe.editor.action((ctx) => {
        const parse = ctx.get(parserCtx)
        const serialize = ctx.get(serializerCtx)
        const doc = parse(markdown)
        if (!doc) throw new Error('规范化失败：Markdown 无法解析为文档')
        out = serialize(doc)
      })
      return out
    },
    destroy: async () => {
      await crepe.destroy()
    },
  }
}
