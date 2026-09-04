import { computed, ref, shallowRef, watch } from 'vue'

import type { DocumentEditor } from '../editor/editor'
import { fileNameOf, type FileService } from '../files/file-service'
import type { DiffLine } from '../history/line-diff'
import { lineDiff } from '../history/line-diff'
import type { History, Version } from '../history/version-store'
import type { RecentFile, RecentFiles } from '../recent/recent-files'
import type { WindowsPort } from '../windows/windows'
import type { Draft, Drafts } from './drafts'
import type { Intent } from './keymap'

/** 三选一确认的结果。系统对话框只有两个按钮，所以这个由应用自绘。 */
export type ConfirmChoice = 'save' | 'discard' | 'cancel'

export interface WorkspaceDeps {
  files: FileService
  history: History
  recent: RecentFiles
  drafts: Drafts
  windows: WindowsPort
  pickFileToOpen: () => Promise<string | null>
  alert: (message: string) => Promise<void>
  confirm: (question: string) => Promise<ConfirmChoice>
  mountEditor: (root: HTMLElement, markdown: string) => Promise<DocumentEditor>
  closeWindow: () => Promise<void>
  now: () => Date
}

/**
 * 应用的全部状态与动作。`App.vue` 只负责把它接到模板和键盘事件上。
 * 依赖全部注入，所以这里的每条流程都能在 node 环境里跑。
 */
export function createWorkspace(deps: WorkspaceDeps) {
  const editor = shallowRef<DocumentEditor | null>(null)
  const host = shallowRef<HTMLElement | null>(null)

  /** 源码模式下文档的真相源是这块文本，编辑器实例此时不存在（ADR 0009）。 */
  const sourceMode = ref(false)
  const sourceText = ref('')
  const findOpen = ref(false)

  const currentPath = ref<string | null>(null)
  const dirty = ref(false)
  const words = ref(0)
  const toast = ref('')
  const saving = ref(false)
  const now = ref(deps.now().getTime())

  const recentList = ref<RecentFile[]>([])
  const recentOpen = ref(false)
  const recentIndex = ref(0)

  const diffOpen = ref(false)
  const versions = ref<Version[]>([])
  const versionIndex = ref(0)
  const diff = ref<DiffLine[]>([])
  const diffLoading = ref(false)

  /**
   * 打开时那一版还没落盘。打开文件不写用户的目录——只看一眼就关掉的文件
   * 不该被建出 `.milktown/`。第一次保存时把它补写进去（ADR 0004）。
   */
  let pendingOpenVersion: { path: string; content: string; at: Date } | null = null
  /** 还原之后的第一次保存必须留下新版本，让「曾经还原过」在历史中可见。 */
  let forceNextKeep = false
  /** 本窗口那份草稿。装回来的和自己落下的都用同一个 id，反复关窗是覆盖（ADR 0010）。 */
  let draftId: string | null = null
  let toastTimer: ReturnType<typeof setTimeout> | undefined

  const fileName = computed(() => (currentPath.value ? fileNameOf(currentPath.value) : '未命名'))
  const showEmptyState = computed(
    () => currentPath.value === null && !dirty.value && words.value === 0 && !sourceMode.value
  )

  // 注册表要知道本窗口装着哪个文件，别的窗口才能判断「已经开着了」（ADR 0011）。
  watch(currentPath, (path) => void deps.windows.claim(path))

  /** 文档只向当前持有真相源的那一方索取（ADR 0002 / 0009）。 */
  function currentMarkdown(): string {
    return sourceMode.value ? sourceText.value : (editor.value?.read() ?? '')
  }

  /**
   * 字数口径：原文字符数，去掉首尾空白（ADR 0009）。两个模式数的是同一个
   * 东西，⌘/ 前后不跳变。ADR 里的 300ms 节流是为了挡住「为了数字数而序列化
   * 一次文档」，这里的 markdown 是编辑器变更事件顺手带来的，没有那笔开销。
   */
  function recount(markdown: string) {
    words.value = markdown.trim().length
  }

  function flash(text: string, ms = 1800) {
    toast.value = text
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toast.value = ''), ms)
  }

  async function report(error: unknown) {
    await deps.alert(error instanceof Error ? error.message : String(error))
  }

  /**
   * 把内容装进当前持有真相源的那一方：写作视图重建编辑器实例（撤销历史
   * 随之清空，ADR 0002），源码模式换掉文本区的内容。
   */
  async function mountDocument(markdown: string) {
    if (sourceMode.value) {
      sourceText.value = markdown
      recount(markdown)
      return
    }

    await editor.value?.destroy()
    editor.value = null
    const root = host.value
    if (!root) return
    root.innerHTML = ''

    const instance = await deps.mountEditor(root, markdown)
    recount(instance.read())
    instance.onChange((next) => {
      dirty.value = true
      recount(next)
    })
    editor.value = instance
  }

  /**
   * ⌘/：真相源的一次交接，两方不同时存在（ADR 0009）。切换不是编辑，
   * 因此不置脏——即使退出时的重新解析改变了文本。
   */
  async function toggleSourceMode() {
    if (busy()) return
    if (sourceMode.value) {
      const text = sourceText.value
      sourceMode.value = false
      findOpen.value = false
      await mountDocument(text)
      return
    }

    const text = editor.value?.read() ?? ''
    await editor.value?.destroy()
    editor.value = null
    if (host.value) host.value.innerHTML = ''
    sourceText.value = text
    recount(text)
    sourceMode.value = true
  }

  /** 文本区的输入与编辑器的文档变更事件同级：都置脏（ADR 0009）。 */
  function editSource(next: string) {
    sourceText.value = next
    dirty.value = true
    recount(next)
  }

  /** ⌘F 在写作视图先切进源码模式——查找条是文本区的东西。 */
  async function openFind() {
    if (!sourceMode.value) await toggleSourceMode()
    findOpen.value = true
  }

  /** 离开当前文件是天然边界，留一版——但只在这个文件已经有历史的时候。 */
  async function keepOnLeave() {
    const path = currentPath.value
    if (!path) return
    try {
      if (!(await deps.history.exists(path))) return
      await deps.history.keep(path, currentMarkdown(), { force: true })
    } catch (error) {
      await report(error)
    }
  }

  /**
   * 有未保存修改时先问。返回 false 表示用户取消了整个动作。
   * 选「保存」而保存本身失败或被取消时，同样返回 false——不能带着没落盘的
   * 内容继续往下走。
   */
  async function settleDirty(what: string): Promise<boolean> {
    if (!dirty.value) return true
    const choice = await deps.confirm(`「${fileName.value}」有未保存的修改，${what}前要保存吗？`)
    if (choice === 'cancel') return false
    if (choice === 'discard') return true
    await save()
    return !dirty.value
  }

  /** 保存还在飞（另存为对话框开着）时，别的流程先让路——否则会跟它抢编辑器。 */
  function busy() {
    if (!saving.value) return false
    flash('正在保存…')
    return true
  }

  async function openPath(path: string) {
    if (busy()) return
    // 已经在别的窗口开着就静默聚焦那边，本窗口什么都不做——连确认框都不弹（ADR 0011）。
    if (await deps.windows.focusIfOpen(path)) return
    if (!(await settleDirty('打开另一个文件'))) return

    let content: string
    try {
      content = (await deps.files.read(path)).content
    } catch (error) {
      recentList.value = deps.recent.forget(path)
      await report(error)
      return
    }

    await keepOnLeave()
    // 手上那份内容仍然没有文件，它的草稿留着（ADR 0010）。
    draftId = null
    // 先把编辑器换好再改状态：挂载失败时不能留下「路径指向新文件、
    // 编辑器里还是旧文档」这种半截状态。
    await mountDocument(content)
    currentPath.value = path
    dirty.value = false
    recentOpen.value = false
    diffOpen.value = false
    now.value = deps.now().getTime()
    recentList.value = deps.recent.remember(path, now.value)

    // 基线只在内存里算：编辑器给出的规范化文本就是它（ADR 0006）。
    pendingOpenVersion = {
      path,
      content: currentMarkdown() || content,
      at: deps.now(),
    }
  }

  async function openWithDialog() {
    recentOpen.value = false
    const picked = await deps.pickFileToOpen()
    if (picked) await openPath(picked)
  }

  async function newDocument() {
    if (busy()) return
    if (!(await settleDirty('新建文档'))) return
    await keepOnLeave()
    await mountDocument('')
    draftId = null
    currentPath.value = null
    pendingOpenVersion = null
    dirty.value = false
    recentOpen.value = false
    diffOpen.value = false
    flash('新文档')
  }

  async function save(asNew = false) {
    // 另存为对话框还开着时再按 ⌘S，两条写入路径会同时在飞。
    if (saving.value || (!editor.value && !sourceMode.value)) return
    saving.value = true
    try {
      // 源码模式写的是文本区里的原文，不经过规范化（ADR 0009）。
      const content = currentMarkdown()
      let path = currentPath.value

      try {
        if (asNew || !path) {
          const picked = await deps.files.saveAs(content, path ? fileNameOf(path) : '未命名.md')
          if (!picked) return
          path = picked
          currentPath.value = picked
          recentList.value = deps.recent.remember(picked, deps.now().getTime())
        } else {
          await deps.files.save(path, content)
        }
      } catch (error) {
        await report(error) // 脏标记不清零：磁盘上还没有这份内容。
        return
      }

      // ponytail: 不检测文件在打开之后是否被别的程序改过，直接覆盖。
      // 要做的话得记 mtime、保存前比对、再设计冲突界面——那是独立一票。
      dirty.value = false
      // 草稿只在内容真正存成文件之后才删（ADR 0010）。
      if (draftId) {
        deps.drafts.remove(draftId)
        draftId = null
      }
      flash(
        `已保存 · ${deps.now().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
      )

      try {
        await keepVersions(path, content)
      } catch (error) {
        // 用户的文件已经落盘，脏标记是「文档 vs 文件」的差异，与历史无关。
        await report(error)
      }
    } finally {
      saving.value = false
    }
  }

  /** 先补写「打开时那一版」，再留当前内容这一版。 */
  async function keepVersions(path: string, content: string) {
    const pending = pendingOpenVersion
    pendingOpenVersion = null
    if (pending && pending.path === path) {
      await deps.history.keep(path, pending.content, { force: true, at: pending.at })
      // 打开之后一个字没改就保存的话，两版内容一样，留一版就够。
      if (pending.content === content) return
    }
    await deps.history.keep(path, content, { force: forceNextKeep || pending !== null })
    forceNextKeep = false
  }

  async function loadDiff(index: number) {
    const version = versions.value[index]
    if (!version) {
      diff.value = []
      return
    }
    diffLoading.value = true
    try {
      const content = await deps.history.read(version)
      // 连按方向键时会有多个读取在飞。只有最后选中的那个版本的结果算数。
      if (versionIndex.value !== index) return
      diff.value = lineDiff(content, currentMarkdown())
    } catch (error) {
      diff.value = []
      await report(error)
    } finally {
      if (versionIndex.value === index) diffLoading.value = false
    }
  }

  async function openDiffView() {
    // 双页视图的差异本来就是源码级的，源码模式叠上去没有增量意义（ADR 0009）。
    if (sourceMode.value) await toggleSourceMode()
    if (!currentPath.value) {
      await deps.alert('这个文档还没有保存过，没有版本可以对比。先按 ⌘S 保存一次。')
      return
    }
    versions.value = await deps.history.list(currentPath.value)
    versionIndex.value = 0
    recentOpen.value = false
    diffOpen.value = true
    await loadDiff(0)
  }

  async function selectVersion(index: number) {
    versionIndex.value = index
    await loadDiff(index)
  }

  /** 把选中版本装回编辑器：文档变脏，磁盘上的文件未被改写。 */
  async function restoreVersion() {
    const version = versions.value[versionIndex.value]
    if (!version || busy()) return
    if (!(await settleDirty('还原'))) return

    try {
      const content = await deps.history.read(version)
      await mountDocument(content)
      dirty.value = true
      forceNextKeep = true
      diffOpen.value = false
      flash('已还原 · 未写入磁盘，⌘S 才落盘')
    } catch (error) {
      await report(error)
    }
  }

  async function requestClose() {
    if (busy()) return
    try {
      // 脏且没有文件可写时留一份草稿，不问——确认对话框服务的是有文件那种（ADR 0010）。
      const keep = dirty.value && !currentPath.value ? currentMarkdown() : null
      if (keep !== null) {
        // 空白的脏文档没什么好留的，也没什么好问的。
        if (keep.trim()) draftId = deps.drafts.put(keep, deps.now().getTime(), draftId ?? undefined)
      } else if (!(await settleDirty('关闭'))) {
        return
      }
      await keepOnLeave()
      await deps.closeWindow()
    } catch (error) {
      // 关窗回调那条路没有别的接手处，错误在这里就得说出来，
      // 否则窗口既不关也不吭声。
      await report(error)
    }
  }

  function toggleRecent() {
    recentOpen.value = !recentOpen.value
    recentIndex.value = 0
    now.value = deps.now().getTime()
  }

  function moveRecent(delta: number) {
    const last = recentList.value.length - 1
    recentIndex.value = Math.min(Math.max(recentIndex.value + delta, 0), Math.max(last, 0))
  }

  async function openSelectedRecent() {
    const file = recentList.value[recentIndex.value]
    if (file) await openPath(file.path)
  }

  /** 意图的总入口。挂载失败一类的意外在这里兜住，不会变成无人接手的 rejection。 */
  async function run(intent: Intent) {
    try {
      await dispatch(intent)
    } catch (error) {
      await report(error)
    }
  }

  async function dispatch(intent: Intent) {
    switch (intent) {
      case 'save':
        return save()
      case 'saveAs':
        return save(true)
      case 'new':
        return newDocument()
      case 'open':
        return openWithDialog()
      case 'recent.toggle':
        return toggleRecent()
      case 'recent.prev':
        return moveRecent(-1)
      case 'recent.next':
        return moveRecent(1)
      case 'recent.open':
        return openSelectedRecent()
      case 'recent.close':
        recentOpen.value = false
        return
      case 'diff.open':
        return openDiffView()
      case 'diff.prev':
        return selectVersion(Math.max(versionIndex.value - 1, 0))
      case 'diff.next':
        return selectVersion(Math.min(versionIndex.value + 1, versions.value.length - 1))
      case 'diff.restore':
        return restoreVersion()
      case 'diff.close':
        diffOpen.value = false
        return
      case 'source.toggle':
        return toggleSourceMode()
      case 'find.open':
        return openFind()
      case 'find.close':
        findOpen.value = false
        return
      case 'window.close':
        return requestClose()
      default:
        return
    }
  }

  async function start(root: HTMLElement) {
    host.value = root
    recentList.value = deps.recent.list()
    await mountDocument('')
    dirty.value = false
  }

  /** 装回一份草稿：文档是脏的，且没有当前文件——⌘S 走另存为（ADR 0010）。 */
  async function restoreDraft(draft: Draft) {
    draftId = draft.id
    await mountDocument(draft.content)
    dirty.value = true
    flash('已恢复上次未保存的草稿 · ⌘S 存成文件', 6000)
  }

  async function destroy() {
    clearTimeout(toastTimer)
    await editor.value?.destroy()
    editor.value = null
  }

  return {
    // 状态
    currentPath,
    fileName,
    dirty,
    words,
    toast,
    saving,
    now,
    showEmptyState,
    recentList,
    recentOpen,
    recentIndex,
    diffOpen,
    versions,
    versionIndex,
    diff,
    diffLoading,
    sourceMode,
    sourceText,
    findOpen,
    // 动作
    start,
    destroy,
    run,
    openPath,
    save,
    selectVersion,
    restoreVersion,
    requestClose,
    restoreDraft,
    toggleRecent,
    toggleSourceMode,
    editSource,
  }
}

export type Workspace = ReturnType<typeof createWorkspace>
