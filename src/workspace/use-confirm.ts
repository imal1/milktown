import { ref } from 'vue'

import type { ConfirmChoice } from './workspace'

/**
 * 应用自绘的三选一确认。系统对话框只有两个按钮，给不了「保存 / 不保存 / 取消」，
 * 而把它拆成两次提问会让人答错——所以四处确认全部走这里。
 */
export function useConfirm() {
  const question = ref<string | null>(null)
  let settle: ((choice: ConfirmChoice) => void) | null = null

  const ask = (text: string) =>
    new Promise<ConfirmChoice>((resolve) => {
      // 上一个确认还开着就再问一次的话，把旧的当作取消收掉。
      settle?.('cancel')
      question.value = text
      settle = resolve
    })

  const answer = (choice: ConfirmChoice) => {
    const resolve = settle
    settle = null
    question.value = null
    resolve?.(choice)
  }

  return { question, ask, answer }
}
