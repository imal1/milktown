import { describe, expect, it } from 'vitest'

import { countStats } from './word-count'

describe('字数口径', () => {
  it('数的是原文字符，首尾空白不算（ADR 0009）', () => {
    expect(countStats('  你好 world  ').words).toBe('你好 world'.length)
  })

  it('空文档四个数都是零', () => {
    expect(countStats('   \n\n  ')).toEqual({ words: 0, paragraphs: 0, lines: 0, minutes: 0 })
  })

  it('段是空行分出来的，行连空行一起数', () => {
    const stats = countStats('# 标题\n\n一段\n还是这一段\n\n另一段')

    expect(stats.paragraphs).toBe(3)
    expect(stats.lines).toBe(6)
  })

  it('约读按每分钟 300 字，再少也写 1 分钟', () => {
    expect(countStats('字').minutes).toBe(1)
    expect(countStats('字'.repeat(900)).minutes).toBe(3)
  })
})
