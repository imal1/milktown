/**
 * 皮肤挂在 Crepe 的类名上（`src/styles.css` 末尾那一段）。Crepe 升级时改掉
 * 一个类名，皮肤会静默地不生效——纸上突然多出几个白盒子，没有任何测试会红。
 * 这个文件就是那根线：我们依赖的每个类名，必须还在 Crepe 自己的样式表里。
 */
import { expect, it } from 'vitest'

// `?inline` 而不是 `?raw`：CSS 走的是 Vite 的样式管线，raw 在 vitest 里拿到
// 的是空串。这也顺带把 @import 展开了，一份就是 Crepe 的全部样式。
import crepe from '@milkdown/crepe/theme/common/style.css?inline'
import ours from '../styles.css?inline'

/** 五个控件，各自我们钉住的那几个类名。 */
const hooks = [
  'milkdown-link-preview',
  'link-preview',
  'milkdown-link-edit',
  'link-edit',
  'milkdown-latex-inline-edit',
  'milkdown-code-block',
  'list-wrapper',
  'milkdown-table-block',
  'cell-handle',
  'button-group',
  'line-handle',
  'add-button',
  'milkdown-image-inline',
  'empty-image-inline',
]

it.each(hooks)('%s 还在 Crepe 的样式表里', (name) => {
  expect(crepe).toContain(`.${name}`)
})

it.each(hooks)('%s 我们这边确实挂了皮肤', (name) => {
  expect(ours).toContain(`.${name}`)
})
