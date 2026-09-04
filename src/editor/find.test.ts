import { describe, expect, it } from 'vitest'

import { findMatches, replaceEvery, stepMatch } from './find'

describe('查找', () => {
  it('找出全部匹配的位置', () => {
    expect(findMatches('横栏 和 横栏', '横栏')).toEqual([
      { start: 0, end: 2 },
      { start: 5, end: 7 },
    ])
  })

  it('忽略大小写', () => {
    expect(findMatches('Bar bar BAR', 'bar').length).toBe(3)
  })

  it('查询里的正则元字符按字面量处理', () => {
    expect(findMatches('a.b axb', 'a.b')).toEqual([{ start: 0, end: 3 }])
  })

  it('空查询没有匹配', () => {
    expect(findMatches('随便什么', '')).toEqual([])
  })

  it('匹配不重叠', () => {
    expect(findMatches('aaaa', 'aa')).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ])
  })
})

describe('匹配间移动', () => {
  it('到头绕回开头，到顶绕回结尾', () => {
    expect(stepMatch(3, 2, 1)).toBe(0)
    expect(stepMatch(3, 0, -1)).toBe(2)
  })

  it('没有匹配时停在 0', () => {
    expect(stepMatch(0, 0, 1)).toBe(0)
  })
})

describe('全部替换', () => {
  it('替换全部匹配', () => {
    expect(replaceEvery('横栏 和 横栏', '横栏', '标题栏')).toBe('标题栏 和 标题栏')
  })

  it('替换文本里的 $& 是字面量，不是回填', () => {
    expect(replaceEvery('a', 'a', '$&b')).toBe('$&b')
  })

  it('空查询原样返回', () => {
    expect(replaceEvery('abc', '', 'x')).toBe('abc')
  })
})
