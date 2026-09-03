<script setup lang="ts">
import { describeRecentFile, type RecentFile } from '../recent/recent-files'

const props = defineProps<{ files: RecentFile[]; selected: number; now: number }>()
const emit = defineEmits<{ open: [path: string]; hover: [index: number]; close: [] }>()

const described = () => props.files.map((f) => describeRecentFile(f, props.now))
</script>

<template>
  <div class="scrim" @click="emit('close')" />
  <div class="panel">
    <div class="label">最近文件</div>
    <div class="rows">
      <button
        v-for="(file, i) in described()"
        :key="file.path"
        class="row"
        :class="{ on: i === selected }"
        @mouseenter="emit('hover', i)"
        @click="emit('open', file.path)"
      >
        <span class="name">{{ file.name }}</span>
        <span class="meta">{{ file.dir }} · {{ file.when }}</span>
      </button>
      <div v-if="files.length === 0" class="empty">还没有打开过文件</div>
    </div>
    <div class="foot">
      <span>↵ 打开 · ↑↓ 选择</span><span>⇧⌘O 其他…</span>
    </div>
  </div>
</template>

<style scoped>
.scrim {
  position: absolute;
  inset: 0;
  background: rgba(253, 252, 249, 0.45);
  z-index: 8;
}

.panel {
  position: absolute;
  top: 36px;
  left: 50%;
  transform: translateX(-50%);
  width: 360px;
  z-index: 9;
  background: #fffefb;
  border: 1px solid rgba(40, 34, 26, 0.1);
  border-radius: 7px;
  box-shadow: 0 14px 34px -12px rgba(40, 34, 26, 0.35);
  overflow: hidden;
}

.label {
  padding: 9px 14px 6px;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.rows {
  padding: 5px;
  max-height: 260px;
  overflow-y: auto;
}

.row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  padding: 7px 12px;
  border: none;
  border-radius: 5px;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.row.on {
  background: var(--highlight);
}

.row .name {
  font-size: 14px;
  color: #555047;
}

.row.on .name {
  color: var(--ink);
}

.meta {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
}

.empty {
  padding: 10px 12px;
  font-size: 13px;
  color: var(--muted);
}

.foot {
  padding: 9px 15px;
  border-top: 1px solid var(--rule-soft);
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 11px;
  color: #b4ac9f;
}
</style>
