import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import hooksPlugin from 'eslint-plugin-react-hooks'
import refreshPlugin from 'eslint-plugin-react-refresh'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  {
    // `dist` is the Vite web build output (pre-existing).
    // `out` is the electron-vite three-segment build output (main,
    //   preload, renderer) — new in Phase 0.
    // `release` is the electron-builder installer output — new in
    //   Phase 0. Without these, `npm run build && npm run lint`
    //   reports ~2000 false errors from the bundled output.
    ignores: ['dist', 'out', 'release', 'dist-electron', 'node_modules', '.vite'],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': hooksPlugin,
      'react-refresh': refreshPlugin,
    },
    rules: {
      ...hooksPlugin.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  prettierConfig,
)
