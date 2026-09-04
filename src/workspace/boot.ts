/** 这个窗口该装什么。 */
export type Assignment = { path: string } | { draft: string } | null

export interface BootPlan {
  /** 本窗口装的东西。 */
  load: Assignment
  /** 交给新窗口去开的文件。 */
  files: string[]
  /** 交给新窗口去恢复的草稿。 */
  drafts: string[]
}

/**
 * 启动时这个窗口做什么。`path` / `draft` 是新窗口被指派的任务，只有最先启动
 * 的那个窗口两样都没有，由它来消化启动参数和草稿。
 *
 * 一个窗口一个文档（ADR 0011），所以多出来的文件和草稿各自另开一个窗口。
 * 双击文件启动时文件优先，草稿留着不动，留到下次空手启动（ADR 0010）。
 */
export function planBoot(input: {
  path: string | null
  draft: string | null
  startupPaths: string[]
  draftIds: string[]
}): BootPlan {
  const nothingElse = { files: [], drafts: [] }
  if (input.path) return { load: { path: input.path }, ...nothingElse }
  if (input.draft) return { load: { draft: input.draft }, ...nothingElse }

  const [firstPath, ...morePaths] = input.startupPaths
  if (firstPath) return { load: { path: firstPath }, files: morePaths, drafts: [] }

  const [firstDraft, ...moreDrafts] = input.draftIds
  if (firstDraft) return { load: { draft: firstDraft }, files: [], drafts: moreDrafts }

  return { load: null, ...nothingElse }
}
