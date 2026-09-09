<script setup lang="ts">
defineProps<{
  fileName: string
  dirty: boolean
  words: number
  recentOpen: boolean
  sourceMode: boolean
}>()

const emit = defineEmits<{ toggleRecent: [] }>()
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

    <span class="words" data-tauri-drag-region>{{ words }}</span>
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

.words {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-faint);
}
</style>
