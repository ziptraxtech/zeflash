import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/api/lambda': {
        target: 'https://oxpqujwper7tjoz3an54ow7gae0jphwq.lambda-url.us-east-1.on.aws',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/lambda/, '')
      }
    }
  }
})