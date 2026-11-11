import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './', // 保证在 GitHub Pages 的任何子路径下均可正常加载静态资源
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
})
