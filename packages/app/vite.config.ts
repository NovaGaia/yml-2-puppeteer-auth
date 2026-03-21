import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const isMock = process.env.VITE_MOCK === 'true'
const mockFile = resolve(__dirname, 'src/__mocks__/tauri-core.ts')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: isMock ? [
      { find: '@tauri-apps/api/core', replacement: mockFile },
      { find: '@tauri-apps/api/event', replacement: mockFile },
      { find: '@tauri-apps/plugin-dialog', replacement: mockFile },
      { find: '@tauri-apps/plugin-fs', replacement: mockFile },
      { find: /^@tauri-apps\//, replacement: mockFile },
    ] : [],
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
