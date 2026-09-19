/**
 * 字数的口径，和它背后那几个数（ADR 0009）。
 *
 * 标题栏上那个数字是「原文字符数，去掉首尾空白」——数的是人写下的那份
 * Markdown，不是排版后的样子，所以 ⌘/ 前后不跳变。点开它是这份口径面板，
 * 把这个数是怎么来的摊开写，不是第二个工具栏（ADR 0013）。
 */
export interface WordStats {
  /** 标题栏上那个数：原文字符数，去首尾空白。 */
  words: number
  /** 段落数：空行分出来的段，空白段不算。 */
  paragraphs: number
  /** 行数：原文里的行，空行也数。 */
  lines: number
  /** 约读几分钟。按每分钟 300 字算，再少也写 1。 */
  minutes: number
}

/** 每分钟读多少字。中文的常见口径，取整数好解释。 */
const PER_MINUTE = 300

export function countStats(markdown: string): WordStats {
  const text = markdown.trim()
  const words = text.length
  return {
    words,
    paragraphs: text === '' ? 0 : text.split(/\n{2,}/).filter((part) => part.trim() !== '').length,
    lines: text === '' ? 0 : text.split('\n').length,
    minutes: words === 0 ? 0 : Math.max(1, Math.round(words / PER_MINUTE)),
  }
}
