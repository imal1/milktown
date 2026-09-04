<script setup lang="ts">
defineProps<{
  fileName: string
  dirty: boolean
  words: number
  recentOpen: boolean
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
      <button class="title" :class="{ on: recentOpen }" @click="emit('toggleRecent')">
        <span class="name">{{ fileName }}{{ dirty ? ' *' : '' }}</span>
        <span class="caret">▾</span>
      </button>
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
  gap: 5px;
  padding: 2px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #3a352e;
  cursor: pointer;
}

.title.on {
  background: var(--highlight);
}

.name {
  font-family: var(--mono);
  font-size: 12px;
}

.caret {
  font-size: 9px;
  color: var(--muted);
}

.words {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
}
</style>
