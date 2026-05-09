# Progressive Mindmap — Agent Guide

## Commands (run in order)

```bash
npm run dev          # Vite dev server → http://localhost:5173
npm run build        # tsc -b && vite build (typecheck then build)
npm test             # vitest run (happy-dom, no jsdom)
npm run lint         # eslint . (TypeScript + react-hooks + react-refresh)
npm run format       # prettier --write . (no semi, singleQuote, trailingComma: all)
```

CI pipeline (`.github/workflows/ci.yml`): `npm ci → npx tsc --noEmit → npx eslint . → npm test`

## Architecture

- Fully client-side SPA (no backend). All data in **IndexedDB** via `idb` library.
- **Zustand** stores persisted through IndexedDB adapter (`src/lib/indexeddb-storage-adapter.ts`). Stores: `providerStore`, `conversationStore`, `mindmapStore`, `chatStore`.
- DB version 5 (`src/lib/db.ts`). Object stores: `providers`, `conversations`, `messages`, `mindmaps`, `zustand-persist`.
- 4 feature modules: `chat/`, `mindmap/`, `conversation/`, `provider/`. Pure logic in `lib/`. Types in `types/`.
- Path alias `@/` → `./src/` (configured in both `vite.config.ts` and `vitest.config.ts`).
- UI: React 18 + Tailwind CSS v4 (`@tailwindcss/vite` plugin) + shadcn/ui (base-nova style) + `@xyflow/react` + dagre layout.

## Mindmap Generation

- `src/lib/mindmap-generator.ts` handles all generation logic.
- Two modes: **full** (rebuild entire tree) and **incremental** (surgical operations).
- Incremental operations: `add_child`, `update`, `merge`, `delete_leaf`, `noop`.
- `editedByUser: true` nodes are **never** overwritten by AI (protected in `applyOperations`).
- Source tracking via `[源: convId/msgId]` annotations in prompts.
- `maxDepth=0` means "auto depth" (no hard limit). Default is 3.
- All generation prompts are in **Chinese**.

## IndexedDB Persistence

- Zustand stores use `createIndexedDBStorage()` (NOT `localStorage`).
- If IndexedDB is unavailable, falls back to memory-only with a console warning.
- `providerStore` rehydrate hook pre-seeds OpenRouter as default provider on first load.

## TypeScript & Linting Rules

- `strict: true`, `noUncheckedIndexedAccess: true` — all array/object access must be guarded.
- `noUnusedLocals: true`, `noUnusedParameters: true` — no dead code.
- `noUnusedLocals` is a **compile error**, not just lint warning.
- `noUncheckedIndexedAccess` means array access `arr[i]` returns `T | undefined` — always guard.
- ESLint: `@typescript-eslint/no-unused-vars: error` with `argsIgnorePattern: ^_`.
- `react-refresh/only-export-components: warn` (off for `src/components/ui/`).
- No `as any`, no `// @ts-ignore` — project convention (per CONTRIBUTING.md).

## Testing

- Vitest with `happy-dom` environment (`vitest.config.ts`).
- Tests in `__tests__/` dirs next to source: `src/lib/__tests__/`, `src/stores/__tests__/`, `src/features/*/__tests__/`.
- `test-setup.ts` imports `@testing-library/jest-dom/vitest`.
- No jsdom — happy-dom only. Some DOM APIs may differ.

## Prettier

```json
{ "semi": false, "singleQuote": true, "tabWidth": 2, "trailingComma": "all", "printWidth": 100 }
```

## OpenCode Workflow

- Work on `opencode` branch only. Never commit to `main` (`.opencode/rules.md`).
- Never push to remote without asking.
- OpenSpec workflow in `openspec/` dir.
- Plugins in `.opencode/plugins/`, skills in `.opencode/skills/`.

### After PR merge — sync without branch switching

After a PR from `opencode` is merged into `main`, sync all branches in one command:

```bash
git fetch origin && git merge origin/main && git push origin opencode && git branch -f main origin/main
```

This updates `opencode` (local + remote) and `main` (local) to match remote `main`. Never checkout `main` just to sync.
