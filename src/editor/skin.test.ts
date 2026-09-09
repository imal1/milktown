/**
 * 皮肤挂在 Crepe 的类名上（`src/styles.css` 末尾那一段）。Crepe 升级时改掉
 * 一个类名，皮肤会静默地不生效——纸上突然多出几个白盒子，没有任何测试会红。
 * 这个文件就是那根线。
 *
 * 咬合的类名从 `styles.css` 里现读，不另立一份清单：清单和样式表迟早会走岔。
 *
 * 两道核对，缺一不可：
 *
 * - 名字还在 Crepe 的样式表里；
 * - 名字 Crepe 真的会挂到 DOM 上。样式表本身不足为凭——它里面就有挂不上的
 *   选择器（`.milkdown-image-inline.empty.selected`，组件从来不加 `empty`
 *   这个类），照抄过来就是一条永远不生效的规则。
 */
import { expect, it } from 'vitest'

// `?inline` 而不是 `?raw`：CSS 走的是 Vite 的样式管线，raw 在 vitest 里拿到
// 的是空串。这也顺带把 @import 展开了，一份就是 Crepe 的全部样式。
import crepe from '@milkdown/crepe/theme/common/style.css?inline'

import ours from '../styles.css?raw'

/** Crepe 与它那几个组件的发布产物。类名是从这里挂到 DOM 上的。 */
const shipped = import.meta.glob<string>(
  [
    '../../node_modules/@milkdown/crepe/lib/**/*.js',
    '../../node_modules/@milkdown/components/lib/**/*.js',
  ],
  { query: '?raw', import: 'default', eager: true }
)

/** 发布产物里所有字符串字面量拆出来的词。类名就在这些词里。 */
const shippedWords = (() => {
  const words = new Set<string>()
  for (const source of Object.values(shipped)) {
    for (const [, literal] of source.matchAll(/["'`]([^"'`\n]{1,80})["'`]/g)) {
      for (const word of literal!.split(/\s+/)) words.add(word)
    }
  }
  return words
})()

/** 皮肤那几条规则里咬着的 Crepe 类名。`milktown-` 开头的是我们自己的，不算。 */
const hooks = (() => {
  const names = new Set<string>()
  for (const [selectors] of ours.matchAll(/\.milktown-editor \.milkdown-[^{]+\{/g)) {
    for (const [, name] of selectors.matchAll(/\.([\w-]+)/g)) {
      if (!name!.startsWith('milktown-')) names.add(name!)
    }
  }
  return [...names]
})()

it('五个控件一个都不少：链接、表格、代码块、图片、公式', () => {
  for (const name of [
    'milkdown-link-preview',
    'milkdown-table-block',
    'milkdown-code-block',
    'milkdown-image-inline',
    'milkdown-latex-inline-edit',
  ]) {
    expect(hooks).toContain(name)
  }
})

it.each(hooks)('%s 还在 Crepe 的样式表里', (name) => {
  expect(crepe).toContain(`.${name}`)
})

it.each(hooks)('%s Crepe 真的会挂到 DOM 上', (name) => {
  expect(shippedWords.has(name)).toBe(true)
})
