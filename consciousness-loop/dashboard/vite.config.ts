import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3457,
    proxy: {
      '/state.json': { target: 'http://localhost:3458', changeOrigin: true },
      '/api': { target: 'http://localhost:3458', changeOrigin: true },
      '/stars': { target: 'http://localhost:3458', changeOrigin: true },
      '/stars-data': { target: 'http://localhost:3458', changeOrigin: true },
      '/graph.json': { target: 'http://localhost:3458', changeOrigin: true },
    },
  },
})
