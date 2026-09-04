import { describe, expect, it } from 'vitest'

import { countWords } from './word-count'

describe('正文字数', () => {
  it('中文按字符数', () => {
    expect(countWords('今天写了三行字')).toBe(7)
  })

  it('英文按词数', () => {
    expect(countWords('the quick brown fox')).toBe(4)
  })

  it('中英混排：中文按字、英文按词，合计', () => {
    expect(countWords('用 Milkdown 写作')).toBe(3 /* 用写作 */ + 1 /* Milkdown */)
  })

  it('标点与空白不算字数', () => {
    expect(countWords('你好，世界！')).toBe(4)
    expect(countWords('  \n\n  ')).toBe(0)
  })

  it('撇号与连字符不断词', () => {
    expect(countWords("don't state-of-the-art")).toBe(2)
  })

  it('日文假名与韩文谚文按字符', () => {
    expect(countWords('ひらがな')).toBe(4)
    expect(countWords('한글')).toBe(2)
  })

  it('空文本是 0', () => {
    expect(countWords('')).toBe(0)
  })
})
