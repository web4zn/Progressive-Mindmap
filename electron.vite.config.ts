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
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { buildContentSecurityPolicy } from './src/lib/desktop-security'

const projectRoot = __dirname
const rendererRoot = resolve(projectRoot, 'src')
const sharedRoot = resolve(projectRoot, 'electron')

/**
 * Injects the production CSP as a `<meta>` tag into the built renderer.
 *
 * The main process also sends the policy as a response header, but `file://`
 * documents do not always surface response headers, so the packaged renderer
 * carries its own copy. Dev is untouched (the dev policy comes from the header).
 */
function productionCspPlugin(): Plugin {
  return {
    name: 'inject-production-csp',
    apply: 'build',
    transformIndexHtml(html) {
      const csp = buildContentSecurityPolicy(false).replace(/"/g, '&quot;')
      return html.replace(
        '</head>',
        `    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n  </head>`,
      )
    },
  }
}

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
        output: {
          // Split the ~2.7 MB single bundle into cacheable vendor chunks.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('@xyflow') || id.includes('@dagrejs') || id.includes('/d3-')) {
              return 'vendor-flow'
            }
            if (
              id.includes('react-markdown') ||
              id.includes('remark-') ||
              id.includes('rehype-') ||
              id.includes('micromark') ||
              id.includes('mdast-') ||
              id.includes('hast-') ||
              id.includes('unified') ||
              id.includes('vfile')
            ) {
              return 'vendor-markdown'
            }
            if (id.includes('/react/') || id.includes('react-dom') || id.includes('/scheduler/')) {
              return 'vendor-react'
            }
            if (id.includes('@ai-sdk') || id.includes('/ai/') || id.includes('/openai/')) {
              return 'vendor-ai'
            }
            return undefined
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': rendererRoot,
      },
    },
    plugins: [react(), tailwindcss(), productionCspPlugin()],
  },
})
