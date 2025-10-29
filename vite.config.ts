import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 👈 이 코드가 브라우저가 파일을 현재 경로에서 찾도록 지시합니다.
  build: {
    rollupOptions: {
      external: ['framer-motion'],
    },
  },
})