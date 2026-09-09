/**
 * @vitest-environment jsdom
 *
 * 日用回路：一个人真的会做的动作，跑在真的 Crepe 上。
 *
 * `workspace.test.ts` 用的是假编辑器——它验的是「工作区在编辑器给出内容之后
 * 怎么做」，结构上看不见编辑器本身。这个文件补的就是那一段：断言的全部是
 * `read()`，也就是 ⌘S 会写进磁盘的那份文本。
 *
 * jsdom 上的一处偏差：ProseMirror 按 `navigator.platform` 决定 `Mod` 是 ⌘
 * 还是 Ctrl，jsdom 里认不出 mac，所以这里用 Ctrl。真机上两者都绑着。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { mountEditor, type DocumentEditor } from './editor'

const MOD = { ctrlKey: true }

let host: HTMLElement
let editor: DocumentEditor

beforeEach(async () => {
  host = document.createElement('div')
  document.body.append(host)
  editor = await mountEditor(host, '')
}, 30_000)

afterEach(async () => {
  await editor.destroy()
  host.remove()
})

/** 敲一段带换行的文本，换行按真的 Enter 走。 */
function write(text: string) {
  text.split('\n').forEach((line, index) => {
    if (index > 0) editor.press('Enter')
    if (line) editor.type(line)
  })
}

/** 把一份文本装进一个新编辑器再取出来——一次「打开、什么都不改、保存」。 */
async function roundTrip(markdown: string): Promise<string> {
  const root = document.body.appendChild(document.createElement('div'))
  const instance = await mountEditor(root, markdown)
  const out = instance.read()
  await instance.destroy()
  root.remove()
  return out
}

describe('输入规则', () => {
  it('# 空格 起标题', () => {
    write('# 标题')
    expect(editor.read()).toBe('# 标题\n')
  })

  it('## 空格 起二级标题', () => {
    write('## 小标题')
    expect(editor.read()).toBe('## 小标题\n')
  })

  it('- 空格 起无序列表，Enter 续下一项', () => {
    write('- 甲\n乙')
    expect(editor.read()).toBe('- 甲\n- 乙\n')
  })

  it('1. 空格 起有序列表，编号自增', () => {
    write('1. 甲\n乙')
    expect(editor.read()).toBe('1. 甲\n2. 乙\n')
  })

  it('> 空格 起引用', () => {
    write('> 引文')
    expect(editor.read()).toBe('> 引文\n')
  })

  it('**x** 变加粗', () => {
    write('这是 **粗** 的')
    expect(editor.read()).toBe('这是 **粗** 的\n')
  })

  it('_x_ 变斜体', () => {
    write('这是 _斜_ 的')
    expect(editor.read()).toBe('这是 _斜_ 的\n')
  })

  it('`x` 变行内代码', () => {
    write('调用 `fn()` 一下')
    expect(editor.read()).toBe('调用 `fn()` 一下\n')
  })
})

describe('分段', () => {
  it('Enter 分出新段落', () => {
    write('第一段\n第二段')
    expect(editor.read()).toBe('第一段\n\n第二段\n')
  })

  it('列表里连按两次 Enter 退出列表', () => {
    write('- 甲')
    editor.press('Enter')
    editor.press('Enter')
    editor.type('正文')
    expect(editor.read()).toBe('- 甲\n\n正文\n')
  })
})

describe('撤销与重做', () => {
  /** 撤销按时间分组，两段之间要真的隔开，否则并成一步。 */
  const pause = () => new Promise((resolve) => setTimeout(resolve, 600))

  it('撤销退回上一步，不是清空整篇', async () => {
    write('底稿')
    await pause()
    editor.press('Enter')
    editor.type('后来的')
    editor.press('z', MOD)
    expect(editor.read()).toBe('底稿\n')
  })

  it('重做把撤销掉的拿回来', async () => {
    write('底稿')
    await pause()
    editor.press('Enter')
    editor.type('后来的')
    editor.press('z', MOD)
    editor.press('Z', { ...MOD, shiftKey: true })
    expect(editor.read()).toContain('后来的')
  })
})

describe('中文', () => {
  it('中文标点与破折号原样保留', () => {
    write('他说：「这样——行吗？」')
    expect(editor.read()).toBe('他说：「这样——行吗？」\n')
  })

  it('中文里的 Markdown 记号照常生效', () => {
    write('# 第一章')
    expect(editor.read()).toBe('# 第一章\n')
  })
})

/**
 * 保存写出去的是 `read()`。这一组盯的是「打开、一个字不改、保存」之后
 * 文件有没有被动过——被动过就是每次保存都在污染用户的文件。
 */
describe('保存出去的文本', () => {
  it('打开又保存不改动文件', async () => {
    const source = '# 标题\n\n正文，带 _斜体_ 和 **加粗**。\n\n- 甲\n- 乙\n'
    expect(await roundTrip(source)).toBe(source)
  })

  it('以列表结尾的文件不会多出空行', async () => {
    expect(await roundTrip('# 标题\n\n- 甲\n')).toBe('# 标题\n\n- 甲\n')
  })

  it('以引用结尾的文件不会多出空行', async () => {
    expect(await roundTrip('# 标题\n\n> 引文\n')).toBe('# 标题\n\n> 引文\n')
  })

  it('代码块原样保留', async () => {
    expect(await roundTrip('```js\nconst a = 1\n```\n')).toBe('```js\nconst a = 1\n```\n')
  })

  it('连按两次 Enter 留的空行不会写成 <br />', () => {
    write('一段')
    editor.press('Enter')
    editor.press('Enter')
    editor.type('二段')
    expect(editor.read()).toBe('一段\n\n二段\n')
  })

  it('空文档存出去是空的，不是一个 <br />', () => {
    expect(editor.read()).toBe('')
  })

  it.fails('已知缺口：空列表项仍会写成 <br />，正确的写法是单独一个 -', async () => {
    expect(await roundTrip('- 甲\n-\n- 乙\n')).not.toContain('<br />')
  })
})

describe('输入法', () => {
  it('合成的起止报出来了——纸面靠它在候选框开着时不动', () => {
    const seen: boolean[] = []
    editor.onComposition((composing) => seen.push(composing))

    host.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    host.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))

    expect(seen).toEqual([true, false])
  })
})

describe('原文对照要的块', () => {
  it('一个块一行：左边排版后的 HTML，右边这个块的原文', async () => {
    write('# 标题\n正文，带 **加粗**。')
    const blocks = editor.blocks()

    expect(blocks).toHaveLength(2)
    expect(blocks[0]!.html).toContain('<h1')
    expect(blocks[0]!.markdown).toBe('# 标题')
    expect(blocks[1]!.html).toContain('<strong>')
    expect(blocks[1]!.markdown).toBe('正文，带 **加粗**。')
  })

  it('拆块不改文档：拆完再读出来还是同一份文本', () => {
    write('# 标题\n正文')
    const before = editor.read()

    editor.blocks()

    expect(editor.read()).toBe(before)
  })
})

describe('光标所在的块', () => {
  it('报得出光标在第几段，也放得回去', () => {
    write('甲\n乙\n丙')
    expect(editor.blockIndex()).toBe(2)

    editor.focusBlock(0)
    expect(editor.blockIndex()).toBe(0)
  })

  it('越界的下标夹到文档范围内，不炸', () => {
    write('甲\n乙')

    editor.focusBlock(99)
    expect(editor.blockIndex()).toBe(1)

    editor.focusBlock(-3)
    expect(editor.blockIndex()).toBe(0)
  })
})

/**
 * 光标所在段的 Markdown 标记（ADR 0014）。标记是画上去的 widget decoration，
 * 所以这一组的每一条都同时验两件事：纸面上看得见，`read()` 里没有。
 */
describe('光标所在段显出 Markdown 标记', () => {
  /** 纸面上这一刻显出来的标记，按出现顺序。 */
  const marks = () => [...host.querySelectorAll('.milktown-mark')].map((el) => el.textContent)

  it('光标进到哪一段，哪一段显标记；移出去就收回', () => {
    write('## 标题\n正文 **粗** 收尾')

    expect(marks()).toEqual(['**', '**'])

    editor.focusBlock(0)
    expect(marks()).toEqual(['##'])
  })

  it('显出来的标记不进保存出去的文本', () => {
    write('## 标题\n正文 **粗**')
    const before = editor.read()

    editor.focusBlock(0)
    expect(marks()).toEqual(['##'])
    expect(editor.read()).toBe(before)
    expect(editor.read()).toBe('## 标题\n\n正文 **粗**\n')
  })

  it('标记不是文档内容——所以进不了剪贴板，也算不进字数', () => {
    write('**粗**')

    // 三条都是同一件事的三个出口：文档里没有这两个字符，任何从文档出发的东西
    // 都看不见它们。剪贴板走的也是这条路。
    expect(marks()).toEqual(['**', '**'])
    expect(editor.read()).toBe('**粗**\n')
    expect(editor.blocks()[0]?.markdown).toBe('**粗**')
    // 光标也落不进去——它不是可编辑的内容。
    const widget = host.querySelector('.milktown-mark')
    expect(widget?.getAttribute('contenteditable')).toBe('false')
  })

  it('行首那几个：标题、引用、无序、有序', () => {
    write('# 一级')
    expect(marks()).toEqual(['#'])

    write('\n> 引用')
    expect(marks()).toEqual(['>'])

    write('\n\n- 项')
    expect(marks()).toEqual(['-'])

    write('\n\n1. 一')
    expect(marks()).toEqual(['1.'])
  })

  it('嵌套的行首标记按原文的顺序拼起来', () => {
    write('> - 项')

    expect(marks()).toEqual(['> -'])
  })

  it('行内那几个：粗、斜、码、删除线、链接、公式', () => {
    write('~~删~~ 和 `码`')
    expect(marks()).toEqual(['~~', '~~', '`', '`'])

    write('\n\n*斜*')
    expect(marks()).toEqual(['*', '*'])

    write('\n\n前 $x^2$ 后')
    expect(marks()).toEqual(['$', '$'])
  })

  it('链接的右半边带着地址', () => {
    write('字')
    editor.press('a', MOD)
    editor.format('format.link')
    // ⌘A 选的是整篇，没有「当前那一段」；把光标收回段里标记才该出现。
    expect(marks()).toEqual([])

    editor.focusBlock(0)
    expect(marks()).toEqual(['[', ']()'])
  })

  it('代码围栏与表格里不显——标记比内容还长，纸面会散架', () => {
    write('甲')
    editor.format('block.code')
    expect(marks()).toEqual([])

    editor.format('block.table')
    expect(marks()).toEqual([])
  })

  it('输入法合成期间标记不动，合成结束才跟上', () => {
    write('甲\n## 乙')
    expect(marks()).toEqual(['##'])

    host.dispatchEvent(new CompositionEvent('compositionstart'))
    // 候选框还开着的时候纸面不许动：光标换段了，标记也不许跟着换。
    editor.focusBlock(0)
    expect(marks()).toEqual(['##'])

    host.dispatchEvent(new CompositionEvent('compositionend'))
    expect(marks()).toEqual([])
  })
})

describe('空文档的起手提示', () => {
  /** 提示是 placeholder：画在纸上，不在文档里（票 #21）。 */
  const placeholder = () => host.querySelector('.milktown-prose [data-placeholder]')

  it('空文档纸上有提示文字', () => {
    expect(placeholder()?.getAttribute('data-placeholder')).toBe('开始写')
  })

  it('提示文字不进 read()——它不是文档内容', () => {
    expect(editor.read()).toBe('')
  })

  it('敲第一个字就消失', () => {
    editor.type('甲')
    expect(placeholder()).toBeNull()
    expect(editor.read()).toBe('甲\n')
  })
})
