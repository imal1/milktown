<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

import { findMatches, replaceEvery, stepMatch } from '../editor/find'

const props = defineProps<{ text: string; findOpen: boolean }>()
const emit = defineEmits<{ edit: [string] }>()

const area = ref<HTMLTextAreaElement | null>(null)
const query = ref('')
const replacement = ref('')
const current = ref(0)

const matches = computed(() => findMatches(props.text, query.value))

/**
 * 文本区背后垫一层同版式的镜像，用来画高亮——textarea 自己画不了。
 * 两者字体、行高、内边距必须完全一致，否则字会错位。
 */
const segments = computed(() => {
  const out: { text: string; hit: boolean; active: boolean }[] = []
  let at = 0
  matches.value.forEach((match, index) => {
    if (match.start > at) out.push({ text: props.text.slice(at, match.start), hit: false, active: false })
    out.push({
      text: props.text.slice(match.start, match.end),
      hit: true,
      active: index === current.value,
    })
    at = match.end
  })
  // 末尾补一个换行：textarea 的最后一个空行要占位，镜像才对得齐。
  out.push({ text: `${props.text.slice(at)}\n`, hit: false, active: false })
  return out
})

/** 改写文本区都走它：`setRangeText` 保留原生撤销栈，一次调用算一步撤销。 */
function rewrite(next: string, start: number, end: number) {
  const el = area.value
  if (!el) return
  el.focus()
  el.setRangeText(next, start, end, 'end')
  emit('edit', el.value)
}

function onInput(event: Event) {
  emit('edit', (event.target as HTMLTextAreaElement).value)
}

/** Tab 插两个空格，不移出焦点——窗口里没有第二个可聚焦的东西。 */
function onTab(event: KeyboardEvent) {
  const el = area.value
  if (!el) return
  event.preventDefault()
  rewrite('  ', el.selectionStart, el.selectionEnd)
}

function go(delta: number) {
  current.value = stepMatch(matches.value.length, current.value, delta)
  reveal()
}

/** 把当前匹配滚进视野。焦点留在查找条里，所以不用文本区的选区。 */
function reveal() {
  void nextTick(() => {
    const mark = area.value?.parentElement?.querySelector('.hit.active')
    mark?.scrollIntoView?.({ block: 'center' })
  })
}

function replaceOne() {
  const match = matches.value[current.value]
  if (!match) return
  rewrite(replacement.value, match.start, match.end)
  void nextTick(() => go(0))
}

/** 全部替换算一步撤销：整块一次性改写。 */
function replaceAll() {
  const el = area.value
  if (!el || matches.value.length === 0) return
  rewrite(replaceEvery(props.text, query.value, replacement.value), 0, props.text.length)
  current.value = 0
}

const find = ref<HTMLInputElement | null>(null)
watch(
  () => props.findOpen,
  (open) => {
    if (open) void nextTick(() => find.value?.select())
  },
  { immediate: true }
)

// 查询变了，当前项回到第一个。
watch(query, () => {
  current.value = 0
  reveal()
})

// 文本区不自己滚动，跟着内容长高，页面滚动由外面那层负责。
watch(
  () => props.text,
  () => {
    void nextTick(() => {
      const el = area.value
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    })
  },
  { immediate: true }
)
</script>

<template>
  <div class="source">
    <div v-if="findOpen" class="findbar">
      <div class="line">
        <span class="label">查找</span>
        <input ref="find" v-model="query" class="field" spellcheck="false" @keydown.enter.prevent="go($event.shiftKey ? -1 : 1)" />
        <span class="count" :class="{ none: matches.length === 0 }">
          {{ matches.length === 0 ? 0 : current + 1 }} / {{ matches.length }}
        </span>
        <button class="step" @click="go(-1)">↑</button>
        <button class="step" @click="go(1)">↓</button>
      </div>
      <div class="line">
        <span class="label">替换</span>
        <input v-model="replacement" class="field" spellcheck="false" @keydown.enter.prevent="replaceOne()" />
        <button class="act" @click="replaceOne()">替换</button>
        <button class="act" @click="replaceAll()">全部</button>
      </div>
      <div class="hint">⏎ 下一个 · ⇧⏎ 上一个 · Esc 关闭</div>
    </div>

    <div class="paper">
      <div class="mirror" aria-hidden="true"><span
        v-for="(segment, index) in segments"
        :key="index"
        :class="segment.hit ? ['hit', { active: segment.active }] : undefined"
      >{{ segment.text }}</span></div>
      <textarea
        ref="area"
        class="area"
        :value="text"
        spellcheck="false"
        @input="onInput"
        @keydown.tab="onTab"
      />
    </div>
  </div>
</template>

<style scoped>
.source {
  padding-bottom: 60px;
}

.findbar {
  margin-bottom: 22px;
  padding: 12px 14px 10px;
  border: 1px solid var(--rule);
  border-radius: 6px;
  background: var(--paper);
  box-shadow: 0 6px 20px -12px rgba(40, 34, 26, 0.35);
}

.line {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.label {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--muted);
  width: 28px;
  flex: none;
}

.field {
  flex: 1;
  min-width: 0;
  border: none;
  border-bottom: 1px solid var(--rule);
  background: transparent;
  padding: 3px 0;
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink);
  outline: none;
}

.field:focus {
  border-bottom-color: #e2dcce;
}

.count {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-soft);
  white-space: nowrap;
}

.count.none {
  color: var(--muted);
}

.step,
.act {
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--ink-soft);
  padding: 2px 6px;
  border-radius: 4px;
}

.step:hover,
.act:hover {
  background: var(--highlight);
}

.hint {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
  padding-top: 6px;
}

/* 镜像与文本区必须共用同一套版式，否则高亮会错位。 */
.paper {
  position: relative;
}

.mirror,
.area {
  font-family: var(--mono);
  font-size: var(--source-size);
  line-height: var(--source-leading);
  white-space: pre-wrap;
  overflow-wrap: break-word;
  padding: 0;
  margin: 0;
  border: none;
}

.mirror {
  position: absolute;
  inset: 0;
  color: transparent;
  pointer-events: none;
}

.hit {
  background: var(--highlight);
  border-radius: 2px;
}

.hit.active {
  background: var(--highlight-active);
}

.area {
  position: relative;
  display: block;
  width: 100%;
  min-height: 40vh;
  resize: none;
  overflow: hidden;
  background: transparent;
  color: var(--ink);
  outline: none;
  caret-color: var(--ink);
}
</style>
