import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: Object.fromEntries(['auth', 'attendance', 'users', 'qr-attendance', 'health'].map((path) => [`/${path}`, { target: 'http://localhost:8000' }])),
  },
})
