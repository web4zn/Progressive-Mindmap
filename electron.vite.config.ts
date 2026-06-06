/**
 * electron-vite three-segment config.
 *
 * Drives the main / preload / renderer build for the desktop app.
 *  - main: ESM bundle, sandbox-friendly, embeds Node modules
 *  - preload: CJS bundle (Electron's sandboxed preload must be CJS)
 *  - renderer: delegates to vite.config.ts
 *
 * Reference: https://electron-vite.org/config/
 */

import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const projectRoot = __dirname
const rendererRoot = resolve(projectRoot, 'src')
const sharedRoot = resolve(projectRoot, 'electron')

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: [] })],
    build: {
      outDir: 'out/main',
      lib: {
        entry: resolve(sharedRoot, 'main/index.ts'),
      },
      rollupOptions: {
        output: {
          // Keep the entry file name predictable so the `main` field in
          // package.json (`out/main/index.js`) resolves.
          entryFileNames: 'index.js',
        },
        // Mark Node built-ins as external so esbuild doesn't try to
        // bundle them. Electron provides them at runtime.
        external: ['electron', 'electron-updater'],
      },
    },
    resolve: {
      alias: {
        '@': rendererRoot,
      },
    },
  },

  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      lib: {
        entry: resolve(sharedRoot, 'preload/index.ts'),
      },
      rollupOptions: {
        output: {
          entryFileNames: 'index.js',
          format: 'cjs',
        },
        // Preload runs in a sandboxed renderer; it can only use the
        // subset of Node that Electron exposes. Keep the bundle lean.
        external: ['electron'],
      },
    },
  },

  renderer: {
    // The React app's index.html lives at the project root (Vite
    // convention). Render the renderer in-place so the existing web
    // build path continues to work.
    root: projectRoot,
    build: {
      outDir: 'out/renderer',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: resolve(projectRoot, 'index.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@': rendererRoot,
      },
    },
    plugins: [react(), tailwindcss()],
  },
})
