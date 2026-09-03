<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'

import DiffView from './components/DiffView.vue'
import RecentPanel from './components/RecentPanel.vue'
import TitleBar from './components/TitleBar.vue'
import { mountEditor, type DocumentEditor } from './editor/editor'
import { createFileService, fileNameOf } from './files/file-service'
import { tauriDialog, tauriFileSystem } from './files/tauri-ports'
import { isUnchanged, lineDiff, type DiffLine } from './history/line-diff'
import { createHistory, type Version } from './history/version-store'
import {
  createRecentFiles,
  describeRecentFile,
  localStorageKeyValue,
  type RecentFile,
} from './recent/recent-files'

const dialog = tauriDialog
const files = createFileService(tauriFileSystem, dialog)
const history = createHistory(tauriFileSystem, { now: () => new Date() })
const recentFiles = createRecentFiles(localStorageKeyValue)

const host = ref<HTMLElement | null>(null)
const editor = shallowRef<DocumentEditor | null>(null)

const currentPath = ref<string | null>(null)
const dirty = ref(false)
const words = ref(0)
const toast = ref('')
const now = ref(Date.now())

const recentList = ref<RecentFile[]>([])
const recentOpen = ref(false)
const recentIndex = ref(0)

const diffOpen = ref(false)
const versions = ref<Version[]>([])
const versionIndex = ref(0)
const diff = ref<DiffLine[]>([])
const diffLoading = ref(false)

/** 还原之后的第一次保存必须留下新版本，让「曾经还原过」在历史中可见。 */
let forceNextKeep = false
let toastTimer: number | undefined

const fileName = computed(() =>
  currentPath.value ? fileNameOf(currentPath.value) : '未命名'
)
const showEmptyState = computed(
  () => currentPath.value === null && !dirty.value && words.value === 0
)
const emptyStateFiles = computed(() =>
  recentList.value.slice(0, 5).map((file) => describeRecentFile(file, now.value))
)

function countWords(markdown: string) {
  return markdown.replace(/\s+/g, '').length
}

function flash(text: string) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 1800) as unknown as number
}

async function report(error: unknown) {
  await dialog.alert(error instanceof Error ? error.message : String(error))
}

/** 用新内容重建编辑器实例——撤销历史随之清空（ADR 0002）。 */
async function mountDocument(markdown: string) {
  await editor.value?.destroy()
  editor.value = null
  if (!host.value) return
  host.value.innerHTML = ''

  const instance = await mountEditor(host.value, markdown)
  words.value = countWords(markdown)
  instance.onChange((next) => {
    dirty.value = true
    words.value = countWords(next)
  })
  editor.value = instance
}

/** 关闭当前文件是天然边界：无条件留存一版。 */
async function keepOnLeave() {
  const path = currentPath.value
  const instance = editor.value
  if (!path || !instance) return
  try {
    await history.keep(path, instance.getMarkdown(), { force: true })
  } catch (error) {
    await report(error)
  }
}

async function confirmDiscard() {
  if (!dirty.value) return true
  return dialog.confirm('当前文档有未保存的修改，继续会丢弃它们。继续？')
}

async function openPath(path: string) {
  if (!(await confirmDiscard())) return
  let content: string
  try {
    content = (await files.read(path)).content
  } catch (error) {
    recentList.value = recentFiles.forget(path)
    await report(error)
    return
  }

  await keepOnLeave()
  currentPath.value = path
  await mountDocument(content)
  dirty.value = false
  recentOpen.value = false
  recentList.value = recentFiles.remember(path, Date.now())
  now.value = Date.now()

  // 打开是天然边界，无条件留一版。基线是编辑器给出的规范化文本，
  // 只在内存里算，用户的文件一个字节都没动（ADR 0006）。
  try {
    await history.keep(path, editor.value?.getMarkdown() ?? content, { force: true })
  } catch (error) {
    await report(error)
  }
}

async function openWithDialog() {
  const picked = await dialog.pickFileToOpen()
  if (picked) await openPath(picked)
}

async function newDocument() {
  if (!(await confirmDiscard())) return
  await keepOnLeave()
  currentPath.value = null
  await mountDocument('')
  dirty.value = false
  recentOpen.value = false
  flash('新文档')
}

async function save(asNew = false) {
  const instance = editor.value
  if (!instance) return
  const content = instance.getMarkdown() // 内容只向编辑器索取（ADR 0002）

  let path = currentPath.value
  try {
    if (asNew || !path) {
      const picked = await files.saveAs(content, path ? fileNameOf(path) : '未命名.md')
      if (!picked) return
      path = picked
      currentPath.value = picked
      recentList.value = recentFiles.remember(picked, Date.now())
    } else {
      await files.save(path, content)
    }
  } catch (error) {
    await report(error) // 脏标记不清零：磁盘上还没有这份内容。
    return
  }

  dirty.value = false
  flash(`已保存 · ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`)

  try {
    await history.keep(path, content, { force: forceNextKeep })
    forceNextKeep = false
  } catch (error) {
    await report(error)
  }
}

async function loadDiff(index: number) {
  const instance = editor.value
  const version = versions.value[index]
  if (!instance || !version) {
    diff.value = []
    return
  }
  diffLoading.value = true
  try {
    const content = await history.read(version)
    // 连按方向键时会有多个读取在飞。只有最后选中的那个版本的结果算数。
    if (versionIndex.value !== index) return
    diff.value = lineDiff(content, instance.getMarkdown())
  } catch (error) {
    diff.value = []
    await report(error)
  } finally {
    if (versionIndex.value === index) diffLoading.value = false
  }
}

async function openDiffView() {
  if (!currentPath.value) {
    await dialog.alert('这个文档还没有保存过，没有版本可以对比。先按 ⌘S 保存一次。')
    return
  }
  versions.value = await history.list(currentPath.value)
  versionIndex.value = 0
  diffOpen.value = true
  recentOpen.value = false
  await loadDiff(0)
}

async function selectVersion(index: number) {
  versionIndex.value = index
  await loadDiff(index)
}

/** 把选中版本装回编辑器：文档变脏，磁盘上的文件未被改写。 */
async function restoreVersion() {
  const version = versions.value[versionIndex.value]
  if (!version) return
  if (dirty.value && !(await dialog.confirm('当前文档有未保存的修改，还原会覆盖它们。继续？')))
    return

  try {
    const content = await history.read(version)
    await mountDocument(content)
    dirty.value = true
    forceNextKeep = true
    diffOpen.value = false
    flash('已还原 · 未写入磁盘，⌘S 才落盘')
  } catch (error) {
    await report(error)
  }
}

function toggleRecent() {
  recentOpen.value = !recentOpen.value
  recentIndex.value = 0
  now.value = Date.now()
}

// 全局快捷键只注册这一处。
function onKeydown(event: KeyboardEvent) {
  if (diffOpen.value) {
    if (event.key === 'Escape') return act(event, () => (diffOpen.value = false))
    if (event.key === 'ArrowDown')
      return act(event, () =>
        selectVersion(Math.min(versionIndex.value + 1, versions.value.length - 1))
      )
    if (event.key === 'ArrowUp')
      return act(event, () => selectVersion(Math.max(versionIndex.value - 1, 0)))
    if (event.key === 'Enter') return act(event, restoreVersion)
  }

  if (recentOpen.value) {
    if (event.key === 'Escape') return act(event, () => (recentOpen.value = false))
    if (event.key === 'ArrowDown')
      return act(event, () => {
        recentIndex.value = Math.min(recentIndex.value + 1, recentList.value.length - 1)
      })
    if (event.key === 'ArrowUp')
      return act(event, () => {
        recentIndex.value = Math.max(recentIndex.value - 1, 0)
      })
    if (event.key === 'Enter') {
      const file = recentList.value[recentIndex.value]
      if (file) return act(event, () => openPath(file.path))
    }
  }

  if (!(event.metaKey || event.ctrlKey)) return
  const key = event.key.toLowerCase()

  if (key === 's') return act(event, () => save(event.shiftKey))
  if (key === 'n') return act(event, newDocument)
  if (key === 'o')
    return act(event, () => {
      if (event.shiftKey) {
        recentOpen.value = false
        return openWithDialog()
      }
      return toggleRecent()
    })
  if (key === 'h' && event.shiftKey) return act(event, openDiffView)
}

function act(event: KeyboardEvent, fn: () => unknown) {
  event.preventDefault()
  void fn()
}

let unlistenClose: (() => void) | undefined

onMounted(async () => {
  recentList.value = recentFiles.list()
  await mountDocument('')
  window.addEventListener('keydown', onKeydown)

  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const appWindow = getCurrentWindow()
    unlistenClose = await appWindow.onCloseRequested(async (event) => {
      event.preventDefault()
      await keepOnLeave()
      await appWindow.destroy()
    })
  } catch {
    // 浏览器里跑（vite dev）时没有 Tauri 窗口，忽略。
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  unlistenClose?.()
  clearTimeout(toastTimer)
})
</script>

<template>
  <div class="window">
    <TitleBar
      :file-name="fileName"
      :dirty="dirty"
      :words="words"
      :recent-open="recentOpen"
      @toggle-recent="toggleRecent"
    />

    <div class="canvas">
      <div class="sheet">
        <div v-if="showEmptyState && emptyStateFiles.length > 0" class="empty-state">
          <div class="label">最近文件</div>
          <div class="rows">
            <button
              v-for="file in emptyStateFiles"
              :key="file.path"
              class="row"
              @click="openPath(file.path)"
            >
              <span class="name">{{ file.name }}</span>
              <span class="meta">{{ file.dir }} · {{ file.when }}</span>
            </button>
          </div>
        </div>
        <div ref="host" class="milktown-editor" />
      </div>
    </div>

    <RecentPanel
      v-if="recentOpen"
      :files="recentList"
      :selected="recentIndex"
      :now="now"
      @open="openPath"
      @hover="recentIndex = $event"
      @close="recentOpen = false"
    />

    <DiffView
      v-if="diffOpen"
      :versions="versions"
      :selected="versionIndex"
      :diff="diff"
      :unchanged="isUnchanged(diff)"
      :loading="diffLoading"
      @select="selectVersion"
      @restore="restoreVersion"
      @close="diffOpen = false"
    />

    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<style scoped>
.window {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background: var(--paper);
}

.canvas {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 48px 40px 0;
}

.empty-state {
  padding-bottom: 26px;
}

.empty-state .label {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 12px;
}

.empty-state .rows {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--rule);
}

.empty-state .row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
  padding: 11px 0;
  border: none;
  border-bottom: 1px solid var(--rule-soft);
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.empty-state .name {
  font-size: 16px;
}

.empty-state .meta {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
}

.toast {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  padding: 7px 14px;
  border-radius: 6px;
  background: rgba(46, 42, 36, 0.9);
  color: #f7f4ec;
  font-family: var(--mono);
  font-size: 11.5px;
  white-space: nowrap;
}
</style>
