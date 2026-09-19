<script setup lang="ts">
import type { CompareRow } from '../workspace/compare'

/**
 * 对照视图：原文对照与磁盘对照共用的外壳（ADR 0015）。
 *
 * 只渲染工作区算好的两栏，并把「退出」发出去。这里不读盘、不算差异、
 * 不碰编辑器——两栏是快照，进来之后不会再变。
 */
defineProps<{
  title: string
  note: string
  rows: CompareRow[]
  leftHead: string
  rightHead: string
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <div class="compare-view">
    <div class="head">
      <span class="label">{{ title }}</span>
      <span class="hint">{{ note }} · Esc 退出</span>
    </div>

    <div class="pane-heads">
      <span>{{ leftHead }}</span>
      <span>{{ rightHead }}</span>
    </div>

    <!-- 一个滚动容器里的两列：两侧天然联动，不用手写滚动同步。 -->
    <div class="scroll">
      <div class="rows">
        <template v-for="(row, i) in rows" :key="i">
          <!-- 左格的 HTML 出自编辑器自己的 schema 序列化，不是外来内容。 -->
          <div class="cell" :class="[row.left.html ? 'typeset' : 'source', row.left.kind]">
            <div v-if="row.left.html" v-html="row.left.html" />
            <template v-else>{{ row.left.text }}</template>
          </div>
          <div class="cell source" :class="row.right.kind">{{ row.right.text }}</div>
        </template>
        <div v-if="rows.length === 0" class="empty">这份文档是空的</div>
      </div>
    </div>

    <div class="foot">
      <button class="close" @click="emit('close')">退出（Esc）</button>
    </div>
  </div>
</template>

<style scoped>
.compare-view {
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

.scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* 两列一行：一行的高度由两格中高的那个撑开，两栏因此段段对齐。 */
.rows {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 14px;
  padding: 0 14px 24px;
  align-items: stretch;
}

.cell {
  min-width: 0;
  padding: 4px 8px;
}

.cell.typeset {
  font-size: 15px;
  line-height: var(--leading, 1.75);
}

.cell.typeset :deep(*) {
  margin: 0;
}

.cell.source {
  font-family: var(--mono);
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--ink-soft);
}

/* 设计稿定死的三个色（#25）。 */
.cell.added {
  background: #e4efdc;
}

.cell.removed {
  background: #f6e0dc;
}

.cell.blank {
  background: #faf8f3;
}

.empty {
  grid-column: 1 / -1;
  padding: 10px 8px;
  font-size: 13px;
  color: var(--muted);
}

.foot {
  border-top: 1px solid var(--rule);
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
</style>
