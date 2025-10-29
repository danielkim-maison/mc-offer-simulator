import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // 👈 Vercel 배포 시, 루트 경로를 명시합니다.
  build: {
    outDir: 'dist', // 👈 빌드 아웃풋 폴더 명시 (Vercel 기본 설정)
    rollupOptions: {
      external: ['framer-motion'],
    },
  },
})