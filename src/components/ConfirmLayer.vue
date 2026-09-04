<script setup lang="ts">
import type { ConfirmChoice } from '../workspace/workspace'

defineProps<{ question: string }>()
const emit = defineEmits<{ choose: [choice: ConfirmChoice] }>()
</script>

<template>
  <div class="scrim">
    <div class="box" role="alertdialog" aria-modal="true">
      <p class="question">{{ question }}</p>
      <div class="choices">
        <button class="primary" @click="emit('choose', 'save')">保存 <kbd>⏎</kbd></button>
        <button @click="emit('choose', 'discard')">不保存 <kbd>⌘D</kbd></button>
        <button @click="emit('choose', 'cancel')">取消 <kbd>Esc</kbd></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrim {
  position: absolute;
  inset: 0;
  /* 盖住最近文件面板与双页视图。 */
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(253, 252, 249, 0.6);
}

.box {
  width: 340px;
  padding: 18px 18px 14px;
  background: #fffefb;
  border: 1px solid rgba(40, 34, 26, 0.1);
  border-radius: 8px;
  box-shadow: 0 18px 40px -14px rgba(40, 34, 26, 0.4);
}

.question {
  margin: 0 0 16px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink);
}

.choices {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border: 1px solid var(--rule);
  border-radius: 5px;
  background: transparent;
  font-family: var(--mono);
  font-size: 11.5px;
  cursor: pointer;
}

button.primary {
  background: var(--highlight);
  border-color: #e2dcce;
}

kbd {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
}
</style>
