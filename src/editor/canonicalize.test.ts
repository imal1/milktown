/**
 * @vitest-environment jsdom
 *
 * 规范化必须调用 Milkdown 实际的 parser 与 serializer，而那套代码需要 DOM。
 * 这是本仓库唯一需要浏览器环境的测试文件，其余测试跑在 node 环境。
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createCanonicalizer, type Canonicalizer } from './canonicalize'

let canon: Canonicalizer

beforeAll(async () => {
  canon = await createCanonicalizer()
}, 30_000)

afterAll(async () => {
  await canon.destroy()
})

describe('规范化', () => {
  it('幂等：对已规范化的文本再次规范化，结果不变', () => {
    const source = '# 标题\n\n正文一段，带 _斜体_ 与 **加粗**。\n\n- 甲\n- 乙\n'
    const once = canon.canonicalize(source)
    expect(canon.canonicalize(once)).toBe(once)
  })

  it('无序列表标记收敛到 -', () => {
    expect(canon.canonicalize('* 甲\n* 乙')).toBe(canon.canonicalize('- 甲\n- 乙'))
    expect(canon.canonicalize('* 甲\n* 乙')).toContain('- 甲')
  })

  it('强调符号收敛：斜体 _、加粗 **', () => {
    const out = canon.canonicalize('这是 *斜* 与 __粗__')
    expect(out).toContain('_斜_')
    expect(out).toContain('**粗**')
  })

  it('代码围栏收敛到反引号', () => {
    const out = canon.canonicalize('~~~js\nconst a = 1\n~~~')
    expect(out).toContain('```js')
    expect(out).not.toContain('~~~')
  })

  it('Setext 标题收敛为 ATX', () => {
    expect(canon.canonicalize('标题\n===')).toBe('# 标题\n')
  })

  it('分隔线收敛到 ---', () => {
    expect(canon.canonicalize('***')).toBe('---\n')
  })

  it('有序列表编号递增', () => {
    const out = canon.canonicalize('1. 甲\n1. 乙\n1. 丙')
    expect(out).toContain('2. 乙')
    expect(out).toContain('3. 丙')
  })

  it('块间空行收敛为一个，文件末尾一个换行', () => {
    const out = canon.canonicalize('一段\n\n\n\n另一段\n\n\n')
    expect(out).toBe('一段\n\n另一段\n')
  })

  it('空文本规范化为空', () => {
    expect(canon.canonicalize('')).toBe('')
  })
})
