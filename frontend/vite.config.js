import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/suggest': 'http://localhost:3001',
      '/search': 'http://localhost:3001',
      '/trending': 'http://localhost:3001',
      '/stats': 'http://localhost:3001'
    }
  }
})
