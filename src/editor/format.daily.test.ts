/**
 * @vitest-environment jsdom
 *
 * 写作面上没有工具栏（ADR 0013）。排版的唯一入口是原生菜单，菜单项的 id 就是
 * 一条 `FormatCommand`。这个文件守两件事：
 *
 * 1. 每一条排版命令都真的改得动文档——断言落在 `read()` 上，也就是保存写出去
 *    的那份文本。工具栏没了，这些命令要是哑的，排版就彻底没有入口了。
 * 2. Crepe 自带的两条浮动工具栏确实没挂上。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import rustSource from '../../src-tauri/src/lib.rs?raw'
import { mountEditor, type DocumentEditor } from './editor'
import { blockFormats, formatCommands, inlineFormats } from './format'

let host: HTMLElement
let editor: DocumentEditor

beforeEach(async () => {
  host = document.body.appendChild(document.createElement('div'))
  editor = await mountEditor(host, '')
}, 30_000)

afterEach(async () => {
  await editor.destroy()
  host.remove()
})

/** 敲一句话，光标停在句末——行内格式要有选区才看得出来，块级不用。 */
function writeLine(text = '一句话') {
  editor.type(text)
}

function selectAll() {
  editor.press('a', { ctrlKey: true })
}

describe('排版命令改得动文档', () => {
  it.each([...blockFormats])('%s 改变了保存出去的文本', (command) => {
    writeLine()
    // 「正文」是降级命令，落在本来就是正文的段落上什么都不该改。先升成标题，
    // 它才有得降——其余命令从正文起步。
    if (command === 'block.text') editor.format('block.h2')
    const before = editor.read()
    editor.format(command)
    expect(editor.read()).not.toBe(before)
  })

  it.each([...inlineFormats])('%s 改变了保存出去的文本', (command) => {
    writeLine()
    selectAll()
    const before = editor.read()
    editor.format(command)
    expect(editor.read()).not.toBe(before)
  })
})

describe('排版命令写出来的是什么', () => {
  it('标题 2 写出 ## ', () => {
    writeLine('标题')
    editor.format('block.h2')
    expect(editor.read()).toBe('## 标题\n')
  })

  it('正文把标题降回去', () => {
    writeLine('标题')
    editor.format('block.h2')
    editor.format('block.text')
    expect(editor.read()).toBe('标题\n')
  })

  it('加粗写出 **', () => {
    writeLine('重点')
    selectAll()
    editor.format('format.strong')
    expect(editor.read()).toBe('**重点**\n')
  })

  it('引用写出 > ', () => {
    writeLine('别人的话')
    editor.format('block.quote')
    expect(editor.read()).toBe('> 别人的话\n')
  })

  it('无序列表写出 - ', () => {
    writeLine('一项')
    editor.format('block.bullet')
    expect(editor.read()).toBe('- 一项\n')
  })
})

describe('写作面上没有工具栏', () => {
  it('选中文字不浮出格式条', () => {
    writeLine()
    selectAll()
    expect(host.querySelector('.milkdown-toolbar')).toBeNull()
  })

  it('行首没有拖拽手柄，也没有斜杠菜单', () => {
    writeLine()
    expect(host.querySelector('.milkdown-block-handle')).toBeNull()
    expect(host.querySelector('.milkdown-slash-menu')).toBeNull()
  })
})

describe('菜单与命令对得上', () => {
  /**
   * 跨语言的一条：Rust 那边的 `MenuItem` id 就是这边的 `FormatCommand`，
   * 对不上的话菜单点下去会静默地什么都不做——两边各自的测试都抓不到。
   */
  // ?raw：不引 node:fs，这份 tsconfig 没有 node 的类型。
  const rust: string = rustSource
  const ids = new Set(
    [...rust.matchAll(/MenuItem::with_id\(\s*app,\s*"([^"]+)"/g)].map((match) => match[1] ?? '')
  )

  it.each([...formatCommands])('菜单里有 %s', (command) => {
    expect(ids.has(command)).toBe(true)
  })

  it('菜单里没有多出来的排版项', () => {
    const strays = [...ids].filter(
      (id) =>
        (id.startsWith('format.') || id.startsWith('block.')) &&
        !formatCommands.includes(id as never)
    )
    expect(strays).toEqual([])
  })
})
