import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import eslint from 'vite-plugin-eslint'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import basicAuth from './plugins/vite-plugin-basic-auth'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    basicAuth(),
    react(),
    tailwindcss(),
    eslint({
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/test/**/*.ts', 'src/test/**/*.tsx'],
      cache: false,
    }),
    process.env.HTTPS === 'true' && basicSsl(),
  ].filter(Boolean),
  server: {
    port: 3002,
    host: true,
    allowedHosts: ['.trycloudflare.com'],
  },
  build: {
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      external: [
        'fs',
        '@capacitor/core',
        '@capacitor/app',
        '@capacitor/haptics',
        '@capacitor/keyboard',
        '@capacitor/status-bar',
        '@capacitor/splash-screen',
        '@capacitor/device',
        '@capacitor/network',
        '@capacitor/preferences',
        '@capacitor/share',
        '@capacitor/browser',
        '@capacitor/filesystem',
        '@capacitor/camera',
        '@capacitor/clipboard',
        '@capacitor/barcode-scanner',
      ],
    },
  },
  worker: {
    format: 'es',
  },
})
