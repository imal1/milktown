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
