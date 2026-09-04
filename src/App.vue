<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import ConfirmLayer from './components/ConfirmLayer.vue'
import DiffView from './components/DiffView.vue'
import RecentPanel from './components/RecentPanel.vue'
import SourceView from './components/SourceView.vue'
import TitleBar from './components/TitleBar.vue'
import { mountEditor } from './editor/editor'
import { createFileService } from './files/file-service'
import { tauriDialog, tauriFileSystem } from './files/tauri-ports'
import { isUnchanged } from './history/line-diff'
import { createHistory } from './history/version-store'
import { isOpenable } from './files/openable'
import { createRecentFiles, describeRecentFile, localStorageKeyValue } from './recent/recent-files'
import { tauriWindows } from './windows/windows'
import { planBoot } from './workspace/boot'
import { createDrafts } from './workspace/drafts'
import { describeDrop, type DropHint } from './workspace/drag-drop'
import { type Intent, intentOf, type Mode } from './workspace/keymap'
import { useConfirm } from './workspace/use-confirm'
import { createWorkspace } from './workspace/workspace'

const confirm = useConfirm()
const drafts = createDrafts(localStorageKeyValue)

const workspace = createWorkspace({
  files: createFileService(tauriFileSystem, tauriDialog),
  history: createHistory(tauriFileSystem, { now: () => new Date() }),
  recent: createRecentFiles(localStorageKeyValue),
  drafts,
  windows: tauriWindows,
  pickFileToOpen: tauriDialog.pickFileToOpen,
  alert: tauriDialog.alert,
  confirm: confirm.ask,
  mountEditor,
  closeWindow: async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().destroy()
  },
  now: () => new Date(),
})

const host = ref<HTMLElement | null>(null)

/** 有东西悬在窗口上方时的提示，`null` 表示没有（2c）。 */
const drop = ref<DropHint | null>(null)

/** 谁在前台，决定同一个按键落到哪套语义上。 */
const mode = computed<Mode>(() => {
  if (confirm.question.value !== null) return 'confirm'
  if (workspace.diffOpen.value) return 'diff'
  if (workspace.recentOpen.value) return 'recent'
  if (workspace.findOpen.value) return 'find'
  return 'writing'
})

const emptyStateFiles = computed(() =>
  workspace.recentList.value
    .slice(0, 5)
    .map((file) => describeRecentFile(file, workspace.now.value))
)

// 全局快捷键只注册这一处。
function onKeydown(event: KeyboardEvent) {
  const intent = intentOf(event, mode.value)
  if (!intent) return
  event.preventDefault()

  if (intent === 'swallow') return
  if (intent === 'confirm.save') return confirm.answer('save')
  if (intent === 'confirm.discard') return confirm.answer('discard')
  if (intent === 'confirm.cancel') return confirm.answer('cancel')

  void workspace.run(intent)
}

/**
 * 这个窗口开起来该装什么：被指派的文件或草稿，没有就消化启动参数和草稿，
 * 多出来的各自另开一个窗口（ADR 0010、0011）。
 */
async function boot() {
  const info = await tauriWindows.boot()
  const plan = planBoot({
    path: info.path,
    draft: info.draft,
    // 后缀在这一处认（ADR 0011）；Rust 那边只管把参数原样递过来。
    startupPaths: info.startupPaths.filter(isOpenable),
    draftIds: drafts.list().map((draft) => draft.id),
  })

  if (plan.load && 'path' in plan.load) {
    await workspace.openPath(plan.load.path)
  } else if (plan.load) {
    const draft = drafts.get(plan.load.draft)
    if (draft) await workspace.restoreDraft(draft)
  }

  await tauriWindows.openFiles(plan.files)
  await tauriWindows.openDrafts(plan.drafts)
}

const unlisten: (() => void)[] = []

onMounted(async () => {
  if (host.value) await workspace.start(host.value)
  window.addEventListener('keydown', onKeydown)

  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const current = getCurrentWindow()

    unlisten.push(
      await current.onCloseRequested((event) => {
        // 关窗要先问脏文档，所以拦下系统的关闭，走应用自己的那条路。
        event.preventDefault()
        void workspace.requestClose()
      })
    )

    unlisten.push(
      // 用窗口自己的 listen：全局的那个会收到发给别的窗口的菜单事件。
      await current.listen<string>('milktown://intent', (event) => {
        const intent = event.payload as Intent
        // 菜单的快捷键绕开了 keymap，前台是确认框时同样不能穿透过去。
        // 只有关窗放行——⌘Q 走的也是这条路，不放行的话确认框开着时它会没反应。
        if (mode.value === 'confirm' && intent !== 'window.close') return
        void workspace.run(intent)
      })
    )

    unlisten.push(
      await current.onDragDropEvent((event) => {
        const payload = event.payload
        if (payload.type === 'over') return
        if (payload.type === 'enter') {
          drop.value = describeDrop(payload.paths, workspace.dirty.value, workspace.fileName.value)
          return
        }
        if (payload.type === 'drop') {
          // 悬停提示可能没来得及算，落下这一刻自己再判一次。
          const [first] = payload.paths
          if (first && isOpenable(first) && mode.value !== 'confirm') {
            void workspace.openPath(first)
          }
        }
        drop.value = null
      })
    )
  } catch {
    // 浏览器里跑（vite dev）时没有 Tauri 窗口，忽略。
  }

  await boot()
})

onBeforeUnmount(async () => {
  window.removeEventListener('keydown', onKeydown)
  for (const off of unlisten) off()
  await workspace.destroy()
})
</script>

<template>
  <div class="window">
    <TitleBar
      :file-name="workspace.fileName.value"
      :dirty="workspace.dirty.value"
      :words="workspace.words.value"
      :recent-open="workspace.recentOpen.value"
      :source-mode="workspace.sourceMode.value"
      @toggle-recent="workspace.toggleRecent()"
    />

    <div class="canvas">
      <div class="sheet">
        <div
          v-if="workspace.showEmptyState.value && emptyStateFiles.length > 0"
          class="empty-state"
        >
          <div class="label">最近文件</div>
          <div class="rows">
            <button
              v-for="file in emptyStateFiles"
              :key="file.path"
              class="row"
              @click="workspace.openPath(file.path)"
            >
              <span class="name">{{ file.name }}</span>
              <span class="meta">{{ file.dir }} · {{ file.when }}</span>
            </button>
          </div>
        </div>
        <!-- 两个持有方只有一个在场，但编辑器的挂载点要一直留着（ADR 0009）。 -->
        <div v-show="!workspace.sourceMode.value" ref="host" class="milktown-editor" />
        <SourceView
          v-if="workspace.sourceMode.value"
          :text="workspace.sourceText.value"
          :find-open="workspace.findOpen.value"
          @edit="workspace.editSource($event)"
        />
      </div>
    </div>

    <RecentPanel
      v-if="workspace.recentOpen.value"
      :files="workspace.recentList.value"
      :selected="workspace.recentIndex.value"
      :now="workspace.now.value"
      @open="workspace.openPath($event)"
      @hover="workspace.recentIndex.value = $event"
      @close="workspace.recentOpen.value = false"
    />

    <DiffView
      v-if="workspace.diffOpen.value"
      :versions="workspace.versions.value"
      :selected="workspace.versionIndex.value"
      :diff="workspace.diff.value"
      :unchanged="isUnchanged(workspace.diff.value)"
      :loading="workspace.diffLoading.value"
      @select="workspace.selectVersion($event)"
      @restore="workspace.restoreVersion()"
      @close="workspace.diffOpen.value = false"
    />

    <ConfirmLayer
      v-if="confirm.question.value !== null"
      :question="confirm.question.value"
      @choose="confirm.answer($event)"
    />

    <div v-if="drop" class="drop-scrim" :class="{ bad: !drop.ok }">
      <div class="drop-line">
        {{ drop.line }} <span v-if="drop.name" class="drop-name">{{ drop.name }}</span>
      </div>
      <div v-if="drop.warn" class="drop-warn">{{ drop.warn }}</div>
    </div>

    <div v-if="workspace.toast.value" class="toast">{{ workspace.toast.value }}</div>
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

/* 拖拽悬停：整窗蒙上一层纸色，连标题栏一起（2c）。不画边框、不画虚线。 */
.drop-scrim {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: var(--scrim-drop);
  animation: drop-in 100ms ease-out;
  pointer-events: none;
}

.drop-scrim.bad {
  color: var(--muted);
}

.drop-line {
  font-size: 15px;
}

.drop-name {
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--highlight);
}

.drop-warn {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
}

@keyframes drop-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
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
