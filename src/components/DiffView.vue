<script setup lang="ts">
import type { DiffLine } from '../history/line-diff'
import type { Version } from '../history/version-store'

/**
 * 双页视图：只渲染历史模块给的版本列表与差异结果，并把用户意图发出去。
 * 这里没有业务逻辑——不读盘、不算差异、不碰编辑器。
 */
const props = defineProps<{
  versions: Version[]
  selected: number
  diff: DiffLine[]
  unchanged: boolean
  loading: boolean
}>()

const emit = defineEmits<{ select: [index: number]; restore: []; close: [] }>()

const time = (version: Version) =>
  version.savedAt.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

const left = () => props.diff.map((l) => (l.kind === 'added' ? null : l))
const right = () => props.diff.map((l) => (l.kind === 'removed' ? null : l))
</script>

<template>
  <div class="diff-view">
    <div class="head">
      <span class="label">版本历史</span>
      <span class="hint">↑↓ 选择版本 · ⏎ 还原到编辑器 · Esc 退出</span>
    </div>

    <div class="body">
      <ul class="versions">
        <li v-for="(version, i) in versions" :key="version.path">
          <button class="version" :class="{ on: i === selected }" @click="emit('select', i)">
            {{ time(version) }}
          </button>
        </li>
        <li v-if="versions.length === 0" class="empty">这个文件还没有版本</li>
      </ul>

      <!-- 一个滚动容器里的两列：两侧天然联动，不用手写滚动同步。 -->
      <div class="panes">
        <div class="pane-heads">
          <span>选中的版本</span>
          <span>当前内容</span>
        </div>
        <div v-if="loading" class="notice">读取中…</div>
        <div v-else-if="unchanged && versions.length > 0" class="notice">
          这个版本与当前内容没有差异
        </div>
        <div class="scroll">
          <div class="columns">
            <div class="column">
              <div
                v-for="(line, i) in left()"
                :key="`l${i}`"
                class="line"
                :class="line?.kind ?? 'blank'"
              >{{ line?.text ?? '' }}</div>
            </div>
            <div class="column">
              <div
                v-for="(line, i) in right()"
                :key="`r${i}`"
                class="line"
                :class="line?.kind ?? 'blank'"
              >{{ line?.text ?? '' }}</div>
            </div>
          </div>
        </div>
        <div class="foot">
          <button class="restore" :disabled="versions.length === 0" @click="emit('restore')">
            还原这个版本
          </button>
          <button class="close" @click="emit('close')">退出（Esc）</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-view {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

.head {
  height: var(--titlebar-height);
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-bottom: 1px solid var(--rule);
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
}

.label {
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.body {
  flex: 1;
  min-height: 0;
  display: flex;
}

.versions {
  width: 190px;
  flex: none;
  margin: 0;
  padding: 8px;
  list-style: none;
  overflow-y: auto;
  border-right: 1px solid var(--rule);
}

.version {
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 5px;
  background: transparent;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink-soft);
  text-align: left;
  cursor: pointer;
}

.version.on {
  background: var(--highlight);
  color: var(--ink);
}

.empty {
  padding: 8px 10px;
  font-size: 13px;
  color: var(--muted);
}

.panes {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.pane-heads,
.foot {
  flex: none;
  display: flex;
  padding: 8px 14px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
}

.pane-heads span {
  flex: 1;
}

.notice {
  flex: none;
  padding: 6px 14px;
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--ink-soft);
}

.scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 12px;
  padding: 0 14px 20px;
}

.column {
  min-width: 0;
}

.line {
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 0 6px;
  min-height: 1.7em;
  user-select: text;
}

.line.added {
  background: #e4efdc;
}

.line.removed {
  background: #f6e0dc;
}

.line.blank {
  background: #faf8f3;
}

.foot {
  border-top: 1px solid var(--rule);
  gap: 10px;
}

.foot button {
  border: 1px solid var(--rule);
  background: transparent;
  border-radius: 5px;
  padding: 4px 10px;
  font-family: var(--mono);
  font-size: 11px;
  cursor: pointer;
}

.foot button:disabled {
  opacity: 0.45;
  cursor: default;
}
</style>
