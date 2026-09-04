/**
 * 源码模式查找条的全部逻辑。纯函数：拿文本与查询，给出位置。
 * 真正改写文本区的是 `setRangeText`（保留原生撤销栈），不在这里。
 */
export interface Match {
  start: number
  end: number
}

const REGEX_CHARS = /[.*+?^${}()|[\]\\]/g

/** 查询按字面量处理、忽略大小写。空查询没有匹配。 */
function matcher(query: string): RegExp {
  return new RegExp(query.replace(REGEX_CHARS, '\\$&'), 'gi')
}

export function findMatches(text: string, query: string): Match[] {
  if (!query) return []
  return [...text.matchAll(matcher(query))].map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
  }))
}

/** 在 count 个匹配之间循环移动。没有匹配时停在 0。 */
export function stepMatch(count: number, current: number, delta: number): number {
  if (count <= 0) return 0
  return (((current + delta) % count) + count) % count
}

/** 替换文本按字面量插入——`$&` 之类不做回填。 */
export function replaceEvery(text: string, query: string, replacement: string): string {
  if (!query) return text
  return text.replace(matcher(query), () => replacement)
}
