<script setup lang="ts">
defineProps<{
  fileName: string
  dirty: boolean
  words: number
  recentOpen: boolean
}>()

const emit = defineEmits<{ toggleRecent: [] }>()

async function windowAction(action: 'close' | 'minimize' | 'toggleMaximize') {
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  await getCurrentWindow()[action]()
}
</script>

<template>
  <div class="titlebar" data-tauri-drag-region>
    <div class="lights">
      <button class="light close" title="关闭" @click="windowAction('close')" />
      <button class="light min" title="最小化" @click="windowAction('minimize')" />
      <button class="light zoom" title="缩放" @click="windowAction('toggleMaximize')" />
    </div>

    <div class="center">
      <button class="title" :class="{ on: recentOpen }" @click="emit('toggleRecent')">
        <span class="name">{{ fileName }}{{ dirty ? ' *' : '' }}</span>
        <span class="caret">▾</span>
      </button>
    </div>

    <span class="words">{{ words }}</span>
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

.lights {
  display: flex;
  gap: 8px;
}

.light {
  width: 10px;
  height: 10px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: #dfd9cc;
  cursor: pointer;
}

.lights:hover .close {
  background: #e8705f;
}
.lights:hover .min {
  background: #e2b04a;
}
.lights:hover .zoom {
  background: #79b25a;
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
