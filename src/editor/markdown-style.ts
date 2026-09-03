/**
 * 序列化风格，按 ADR 0006 钉死。
 *
 * 交给 remark-stringify（Milkdown 内部使用 ^11）。整体对齐 Prettier 的
 * Markdown 默认值，以便文件被其他工具处理时冲突最小。
 */
export const markdownStyle = {
  bullet: '-',
  emphasis: '_',
  strong: '*',
  fence: '`',
  fences: true,
  rule: '-',
  ruleRepetition: 3,
  setext: false,
  incrementListMarker: true,
  listItemIndent: 'one',
  tightDefinitions: true,
} as const
