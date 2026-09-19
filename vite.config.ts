import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },

  test: {
    // Pure logic tests need no browser. The few tests that do (canonicalization)
    // opt in with a `@vitest-environment jsdom` docblock.
    environment: 'node',
    // 默认 vitest 不处理 CSS，`?inline` 拿到的是空串。皮肤那条测试要读真的
    // 样式表（`src/editor/skin.test.ts`），所以开着。
    css: true,
    include: ['src/**/*.test.ts'],
    // jsdom 缺的浏览器 API 在这里补齐；node 环境的测试用不到它们。
    setupFiles: ['./src/test-setup.ts'],
  },
})
