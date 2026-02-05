import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    root: 'src/ui',
    build: {
        outDir: '../../dist',
        emptyOutDir: true
    },
    server: {
        proxy: {
            '/api': 'http://localhost:3001'
        }
    }
})
