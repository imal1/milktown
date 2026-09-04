import { describe, expect, it } from 'vitest'

import { extensionOf, isOpenable, OPENABLE_EXTENSIONS } from './openable'

describe('extensionOf', () => {
  it('取末尾后缀并转小写', () => {
    expect(extensionOf('/tmp/a.MD')).toBe('md')
    expect(extensionOf('/tmp/笔记.markdown')).toBe('markdown')
  })

  it('多个点只取最后一段', () => {
    expect(extensionOf('/tmp/2026-09.draft.md')).toBe('md')
  })

  it('没有后缀与点开头的文件都算没有后缀', () => {
    expect(extensionOf('/tmp/README')).toBe('')
    expect(extensionOf('/tmp/.gitignore')).toBe('')
  })
})

describe('isOpenable', () => {
  it('清单里的五种后缀都认', () => {
    for (const ext of OPENABLE_EXTENSIONS) expect(isOpenable(`/tmp/a.${ext}`)).toBe(true)
  })

  it('清单外的不认', () => {
    expect(isOpenable('/tmp/a.png')).toBe(false)
    expect(isOpenable('/tmp/README')).toBe(false)
  })
})
