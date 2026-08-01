import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 相対パスなら、リポジトリ名が変わっても GitHub Pages のプロジェクト配下で動作する。
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    coverage: { reporter: ['text', 'html'] },
  },
})
