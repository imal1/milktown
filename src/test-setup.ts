/**
 * jsdom 缺的浏览器 API。补的是环境，不是行为——每一个都只补到
 * 「被观察的东西当作一直可见」这个程度，编辑器不会因为看不见而少做事。
 */
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

const globals = globalThis as Record<string, unknown>
globals.IntersectionObserver ??= NoopObserver
globals.ResizeObserver ??= NoopObserver

// jsdom 的 Range 不实现几何。虚拟光标插件（prosemirror-virtual-cursor）在每次
// 选区变化时量光标的位置，没有它会直接抛。补成「量不出任何矩形」，插件因此
// 不画——它画在哪里不是这一层要验的东西。
if (typeof Range !== 'undefined' && !Range.prototype.getClientRects) {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => new DOMRect()
}
