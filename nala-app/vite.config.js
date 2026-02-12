import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    proxy: {
      '/ee2101': {
        target: 'http://localhost:8000',
        changeOrigin: true
        // rewrite removed: let Gateway handle stripping
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/mh1810': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
