import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  // 👈 이 부분이 마지막 문제를 해결합니다.
  build: {
    rollupOptions: {
      external: ['framer-motion'],
    },
  },
})