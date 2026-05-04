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
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('firebase')) return 'vendor-firebase'
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor-react'
          if (id.includes('lucide-react')) return 'vendor-icons'
          return 'vendor'
        },
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
})
