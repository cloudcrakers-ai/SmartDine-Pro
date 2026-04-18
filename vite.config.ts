import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        staff: resolve(__dirname, 'staff.html'),
        waiter: resolve(__dirname, 'waiter.html'),
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
})
