import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import hooksPlugin from 'eslint-plugin-react-hooks'
import refreshPlugin from 'eslint-plugin-react-refresh'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

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
    // Node.js helper scripts (smoke tests, codegen, etc.) live in
    // `scripts/` and run under plain Node, not Vite. Expose the Node
    // + ESM globals so ESLint stops flagging `process`, `console`,
    // `setTimeout`, etc. as undefined.
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2024 },
    },
  },

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
      // Downgraded from error to warn: these React Compiler rules are overly
      // conservative for our patterns (prop→state sync, refs in event handlers).
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
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
