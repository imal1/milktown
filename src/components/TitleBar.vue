<script setup lang="ts">
import type { WordStats } from '../workspace/word-count'

defineProps<{
  fileName: string
  dirty: boolean
  words: number
  recentOpen: boolean
  sourceMode: boolean
  statsOpen: boolean
  stats: WordStats
}>()

const emit = defineEmits<{ toggleRecent: []; toggleStats: [] }>()
</script>

<template>
  <!--
    窗口是原生的（macOS 的 Overlay 标题栏样式）：圆角、阴影、交通灯、
    双击标题栏放大都归系统。这里只画交通灯右边的那一条，并整体作为
    拖拽区——webview 盖住了标题栏，拖动得由 data-tauri-drag-region 交回系统。
  -->
  <div class="titlebar" data-tauri-drag-region>
    <div class="lights-space" data-tauri-drag-region />

    <div class="center" data-tauri-drag-region>
      <!--
        文件名和 ▾ 是一个可点的整体，不是一段文字旁边挂个箭头。热区占满标题栏
        的高度，空文档时也有 96px 宽——「未命名」只有三个字，点不着。
      -->
      <button class="title" :class="{ on: recentOpen }" @click="emit('toggleRecent')">
        <span class="name">{{ fileName }}</span>
        <!-- 脏用一个点，不用星号：星号会跟文件名连成一串读。 -->
        <span v-if="dirty" class="dot" aria-label="未保存" />
        <span class="caret">▾</span>
      </button>
      <!-- 第三处模式指示：标题栏、菜单里的勾、以及正文换了面孔。 -->
      <span v-if="sourceMode" class="badge">原文</span>
    </div>

    <!--
      字数不是一个光秃秃的数字：口径写在数字后面，点开是这个数怎么来的
      （ADR 0009），不是第二个工具栏（ADR 0013）。
    -->
    <div class="words-slot">
      <button class="words" :class="{ on: statsOpen }" @click="emit('toggleStats')">
        <span class="count">{{ words }}</span>
        <span class="unit">字</span>
      </button>
      <div
        v-if="statsOpen"
        class="stats"
        tabindex="-1"
        @keydown.esc="emit('toggleStats')"
        @focusout="emit('toggleStats')"
        @vue:mounted="($event.el as HTMLElement).focus()"
      >
        <div class="row">
          <span class="label">字数</span><span class="value">{{ stats.words }}</span>
        </div>
        <div class="row">
          <span class="label">段落</span><span class="value">{{ stats.paragraphs }}</span>
        </div>
        <div class="row">
          <span class="label">行</span><span class="value">{{ stats.lines }}</span>
        </div>
        <div class="row">
          <span class="label">约读</span><span class="value">{{ stats.minutes }} 分钟</span>
        </div>
        <div class="caliber">数的是原文字符，去掉首尾空白</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.titlebar {
  height: var(--titlebar-height);
  flex: none;
  display: flex;
  align-items: center;
  padding: 0 13px;
  gap: 12px;
  border-bottom: 1px solid var(--rule);
  user-select: none;
}

/* 系统交通灯就画在这块位置上（三个灯占到 x≈68），给它让出来。 */
.lights-space {
  width: 72px;
  flex: none;
}

.center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: var(--titlebar-height);
  min-width: 96px;
  padding: 0 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #3a352e;
  cursor: pointer;
}

.title:hover,
.title.on {
  background: var(--highlight);
}

.title:focus-visible {
  outline: 1.5px solid var(--focus);
  outline-offset: -1.5px;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--dirty);
}

.name {
  font-family: var(--mono);
  font-size: 12px;
}

.caret {
  font-size: 9px;
  color: var(--muted);
}

.badge {
  margin-left: 8px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--highlight);
  font-family: var(--mono);
  font-size: 10px;
  color: var(--ink-soft);
}

.words-slot {
  position: relative;
  flex: none;
}

.words {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 22px;
  padding: 0 6px;
  border: none;
  border-radius: 4px;
  background: transparent;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-faint);
  cursor: pointer;
}

.words:hover,
.words.on {
  background: var(--highlight);
}

.words:focus-visible {
  outline: 1.5px solid var(--focus);
  outline-offset: -1.5px;
}

.unit {
  color: var(--muted);
}

.stats {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 20;
  min-width: 148px;
  padding: 8px 10px;
  border: 1px solid var(--rule);
  border-radius: 6px;
  background: var(--paper);
  box-shadow: 0 6px 20px -12px rgba(40, 34, 26, 0.35);
  outline: none;
}

.stats .row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 2px 0;
  font-family: var(--mono);
  font-size: 11px;
}

.stats .label {
  color: var(--muted);
}

.stats .value {
  color: var(--ink-soft);
}

.caliber {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--rule-soft);
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
}
</style>
