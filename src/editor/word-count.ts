// 中日韩：汉字、假名、谚文，一个字符算一个字。
const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/gu
// 其余文字：连续的字母 / 数字算一个词，词内的撇号与连字符不断词。
const WORD = /[\p{Letter}\p{Number}]+(?:['’\-][\p{Letter}\p{Number}]+)*/gu

/**
 * 正文字数。中日韩按字符、其余按词，合计成一个数——写中文时它等于字数，
 * 写英文时它等于词数。输入是编辑器给出的**纯文本**，不是 Markdown 源码：
 * `#`、`**`、URL 都不该算进字数里。
 */
export function countWords(text: string): number {
  const cjk = text.match(CJK)?.length ?? 0
  // 西文词里不能混进中日韩字符，否则「中文abc」会被数成一个词又数几个字。
  const words = text.replace(CJK, ' ').match(WORD)?.length ?? 0
  return cjk + words
}
