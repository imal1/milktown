export type DiffKind = 'same' | 'added' | 'removed'

export interface DiffLine {
  kind: DiffKind
  text: string
}

/**
 * 两段**已规范化**文本之间的行级差异。
 *
 * 输入未规范化的文本会得到被格式噪音淹没的结果——调用方负责先规范化
 * （ADR 0006）。
 */
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = splitLines(before)
  const b = splitLines(after)

  // 先削掉公共前后缀，LCS 只跑中间那段。
  let head = 0
  while (head < a.length && head < b.length && a[head] === b[head]) head++

  let tail = 0
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  )
    tail++

  const midA = a.slice(head, a.length - tail)
  const midB = b.slice(head, b.length - tail)

  return [
    ...a.slice(0, head).map(same),
    ...diffMiddle(midA, midB),
    ...a.slice(a.length - tail).map(same),
  ]
}

/** 差异是否为空——两段内容相同。 */
export function isUnchanged(diff: DiffLine[]): boolean {
  return diff.every((line) => line.kind === 'same')
}

function same(text: string): DiffLine {
  return { kind: 'same', text }
}

function splitLines(text: string): string[] {
  if (text === '') return []
  return text.replace(/\n$/, '').split('\n')
}

// ponytail: 经典 LCS 动态规划，O(n*m) 时间与内存。单个 Markdown 文件的规模下
// 够用；哪天要对比整本书，再换 Myers 差分。
function diffMiddle(a: string[], b: string[]): DiffLine[] {
  if (a.length === 0) return b.map((text) => ({ kind: 'added', text }) as DiffLine)
  if (b.length === 0) return a.map((text) => ({ kind: 'removed', text }) as DiffLine)

  const width = b.length + 1
  const lcs = new Uint32Array((a.length + 1) * width)

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * width + j] =
        a[i] === b[j]
          ? lcs[(i + 1) * width + j + 1]! + 1
          : Math.max(lcs[(i + 1) * width + j]!, lcs[i * width + j + 1]!)
    }
  }

  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i]! })
      i++
      j++
    } else if (lcs[(i + 1) * width + j]! >= lcs[i * width + j + 1]!) {
      out.push({ kind: 'removed', text: a[i]! })
      i++
    } else {
      out.push({ kind: 'added', text: b[j]! })
      j++
    }
  }
  while (i < a.length) out.push({ kind: 'removed', text: a[i++]! })
  while (j < b.length) out.push({ kind: 'added', text: b[j++]! })

  return out
}
