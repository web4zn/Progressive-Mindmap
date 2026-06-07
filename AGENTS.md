# Progressive Mindmap — Agent Guide

A local-first React 18 + TypeScript SPA that turns LLM conversations into editable mindmaps. All data lives in the browser (IndexedDB); there is no backend.

## Commands

```bash
npm ci            # install (CI does this; locally prefer over npm install)
npm run dev       # Vite dev server → http://localhost:5173
npm run build     # tsc -b && vite build (typecheck then build)
npm test          # vitest run (happy-dom — no jsdom)
npm run lint      # eslint . (TypeScript + react-hooks + react-refresh)
npm run format    # prettier --write . (no semi, singleQuote, trailingComma: all)
```

CI pipeline (`.github/workflows/ci.yml`): `npm ci → npx tsc --noEmit → npx eslint . → npm test`

## Architecture

- **4 feature modules:** `src/features/{chat,conversation,mindmap,provider}`. Pure logic in `src/lib/`, types in `src/types/`, workers in `src/workers/`.
- **State:** Zustand stores persisted through `src/lib/indexeddb-storage-adapter.ts` (NOT `localStorage`). Stores: `providerStore`, `conversationStore`, `mindmapStore`, `chatStore`. DB version 5 (`src/lib/db.ts`); object stores: `providers`, `conversations`, `messages`, `mindmaps`, `zustand-persist`.
- **AI generation:** `src/lib/mindmap-generator.ts` — `full` rebuild + `incremental` ops (`add_child` / `update` / `merge` / `delete_leaf` / `noop`). Nodes with `editedByUser: true` are never overwritten (`applyOperations` is the only sanctioned writer).
- **Agent subsystem:** `src/lib/agent/` — ReAct runner, BaseAgent, Zod-validated tool schemas, "mediate mode" where the agent owns a conversation.
- **UI:** React 18, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui (base-nova), `@xyflow/react` + dagre for the mindmap canvas.
- **Path alias:** `@/` → `./src/` (resolved in both `vite.config.ts` and `vitest.config.ts`).
- **Generation prompts are in Chinese.** Keep them in Chinese when modifying.

## TypeScript & Linting Rules

- `strict: true`, `noUncheckedIndexedAccess: true` — array/object access returns `T | undefined`; always guard.
- `noUnusedLocals: true`, `noUnusedParameters: true` — **compile errors**, not warnings.
- ESLint `@typescript-eslint/no-unused-vars: error` with `argsIgnorePattern: ^_`.
- `react-refresh/only-export-components: warn` (off for `src/components/ui/`).
- **No** `as any`, **no** `// @ts-ignore`, **no** `// @ts-expect-error` without a justifying comment and a linked follow-up.
- Prettier: `semi: false`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: all`, `printWidth: 100`.

## Testing

- **Vitest + happy-dom** (`vitest.config.ts`). No jsdom — some DOM APIs differ.
- Tests live in `__tests__/` dirs next to source: `src/lib/__tests__/`, `src/stores/__tests__/`, `src/features/*/__tests__/`.
- `src/test-setup.ts` imports `@testing-library/jest-dom/vitest`.
- IndexedDB fixtures need the real adapter or a focused mock — never `localStorage`.
- `npm test` must pass with no skipped tests unless the skip is documented in the test name.

## Workflow

- **Branch:** work on `opencode`. Never push to `main` directly, never push to remote without explicit user approval.
- **Commits:** Conventional Commits (`feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:`).
- **OpenSpec:** non-trivial changes go through `openspec/changes/<name>/` with `proposal.md` + `tasks.md` + `specs/`. Skip OpenSpec only for one-line fixes and CI / docs tweaks.
- **PR chain:** open against `opencode`, wait for green CI (`npm ci → tsc --noEmit → eslint → vitest`), get user approval before pushing the merge back to `main`.
- **After PR merge** — sync branches without checking out main:
  ```bash
  git fetch origin && git merge origin/main && git push origin opencode && git branch -f main origin/main
  ```

## Security

- Never commit secrets — `.env` is in `.gitignore`. API keys live in `providerStore`, not in code.
- Mindmap node content is sanitized via `src/lib/html-sanitizer.ts` (DOMPurify) before render. Don't bypass it.
- AI-generated nodes must carry a `[源: convId/msgId]` source annotation in the prompt and surface it in the UI.

## Project context

- **Solo project.** Author = reviewer. The `code-reviewer` rein still runs its hard-reject checklist (`as any`, raw `localStorage`, hard-coded keys, etc.) as a self-check, but no second pair of eyes is required. If you later add collaborators, re-tighten that gate.

## Mindmap frontend capability overview

The mindmap UI ships in four engineering waves. Each is locked by
a `feat(mindmap-ui): stage <letter>` commit and has a corresponding
`openspec/specs/mindmap-ui-stage-<letter>/spec.md`.

| Stage | Commit   | Scope                                                                 |
| ----- | -------- | --------------------------------------------------------------------- |
| A1    | bda78e1  | React Flow canvas + dagre LR + collapse / expand + node affordance   |
| A2    | b5ee851  | Hover path highlight + streaming shimmer + search-match outline      |
| B     | ec4f5f7  | 3-section header + combobox + drawer + resizable markdown modal       |
| C     | 0cda8a1  | Path / edge highlight + undo top-bar + outline + search + filter + background switcher + keyboard nav + touch long-press + MiniMap viewport |
| D     | (this)   | Dark theme + CSS variables + animation tokens + `data-pattern` prop + style split + boundary tests + type tightening |

### Theme (Stage D)

The app has a single global theme (`light` / `dark` / system) managed
by `useTheme()` (`src/hooks/useTheme.ts`). It toggles
`html.dark` and `html[data-theme]` together so the same hook
serves both shadcn/Tailwind (`html.dark`) and FlowShell
(`[data-theme]`). Persistence is `localStorage` under the key
`progressive-mindmap:theme`. The toggle button lives in the
mindmap panel toolbar (data-testid `mindmap-theme-toggle`).

### CSS variables (Stage D)

All animation durations resolve to `var(--duration-fast | --duration-base | --duration-slow)`
and the easing is `var(--ease-out)`. `prefers-reduced-motion: reduce`
zeroes the duration tokens. Pattern accent colours live in
`src/index.css` as `--flow-pattern-{auto|5w1h|tech|pros-cons}` and
are consumed by `[data-pattern=...]` rules in
`src/components/flow-shell/css/theme.css`.

### FlowShell CSS split (Stage D)

`src/components/flow-shell/flow-shell.css` is a 5-line
`@import` aggregator; the real rules live in
`src/components/flow-shell/css/{theme,node,edge,canvas,animations}.css`.
Adding a new rule? Put it in the partial that matches its concern.



## Adding agent rules

- Project conventions belong in this file (root) — short, agent-agnostic.
- Mavis-specific reins (orchestrator + developer / tester / code-reviewer / mindmap-expert / agent-expert) live under `.harness/`. Other agents (OpenCode, Cursor, etc.) ignore that directory unless explicitly configured.
- Contributor workflow and code-style details are in `CONTRIBUTING.md`.
