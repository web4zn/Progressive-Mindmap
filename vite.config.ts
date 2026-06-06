import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Use relative asset paths so the production build loads correctly
  // under `file://` when Electron renders the bundled `dist/index.html`.
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Expose a few Node-style constants to the renderer. The renderer
    // is sandboxed in Electron and has no direct `process` access, so
    // we inject the build-time platform string via Vite's `define`.
    'process.platform': JSON.stringify(process.platform),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
  },
  build: {
    // Explicitly cap chunk size to keep the renderer responsive. Phase
    // 0 doesn't split chunks further; Phase 1 can revisit if needed.
    chunkSizeWarningLimit: 1024,
  },
})
