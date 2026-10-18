# Progressive Mindmap — Agent Guide

An Electron desktop app (macOS `.dmg` / Windows NSIS + portable / Linux AppImage) that turns LLM conversations into editable mindmaps. The renderer is React 18 + TypeScript; all data lives locally in IndexedDB and there is no backend.

## Commands

```bash
npm ci            # install (CI does this; locally prefer over npm install)
npm run dev       # electron-vite dev — starts main + preload + renderer and opens the Electron window
npm run build     # npm run typecheck && electron-vite build → out/{main,preload,renderer}
npm run preview   # electron-vite preview (run the production build)
npm run typecheck # tsc --noEmit (renderer) + tsc --noEmit -p electron/tsconfig.json
npm test          # vitest run (happy-dom — no jsdom)
npm run test:e2e  # Playwright Electron smoke; run `npm run build` first
npm run lint      # eslint . (TypeScript + react-hooks + react-refresh)
npm run format    # prettier --write . (no semi, singleQuote, trailingComma: all)
npm run smoke:electron # main-process smoke test (scripts/smoke-electron.mjs)
```

Platform packaging (output `release/${version}`):

```bash
npm run build:win      # NSIS installer + portable .exe
npm run build:mac      # .dmg (x64 + arm64)
npm run build:linux    # .AppImage
```

CI pipelines:

- `.github/workflows/ci.yml` (push / PR to `main`): `npm ci → npx tsc --noEmit → npx eslint . → npm run build → npm test`, plus an `e2e` job (`npm ci → npm run build → xvfb-run -a npm run test:e2e`).
- `.github/workflows/build-desktop.yml` (push / PR to `opencode`): `npm ci → npm run typecheck (both tsconfigs) → npm run lint → npm run build:{mac,win,linux}` and uploads installers; **it does not run the test suite**. Version-tag pushes also create / update the GitHub Release.

## Architecture

- **Electron three-process split:** `electron/main/` (window, menu, IPC, updater stub), `electron/preload/` (typed `window.api` bridge), renderer (React 18). `BrowserWindow` is created with `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. The preload bridge is Phase-0 scaffolding; the renderer does not call it yet.
- **4 feature modules:** `src/features/{chat,conversation,mindmap,provider}`. Pure logic in `src/lib/`, types in `src/types/`, workers in `src/workers/`.
- **State:** Zustand stores persisted through `src/lib/indexeddb-storage-adapter.ts` (NOT `localStorage`). Stores: `providerStore`, `conversationStore`, `mindmapStore`, `chatStore`. IndexedDB database `progressive-mindmap`, `DB_VERSION = 6` (`src/lib/db.ts`); object stores: `providers`, `conversations`, `messages`, `mindmaps`, `zustand-persist`, `mindmap-meta`.
- **Generation — one write funnel:** the Agent emits incremental operations only — `generateMindmapOps` (tool) → Zod schema (`src/lib/agent/schema.ts`) → `applyOperations` → `useMindmapStore.updateMindmapTree`. Operation types are `add_child` / `update` / `delete_leaf` / `add_root` / `reparent`. `applyOperations` lives in `src/lib/agent/agent-tools.ts`. Nodes with `editedByUser: true` are never overwritten.
- **Generation context:** `mindmapTreeToFlatContext` (flattened tree, capped at 200 nodes) plus the most recent messages — 6 for conversation enhancement, 4 for mediate mode.
- **Two AI stacks:** the chat stream uses the `openai` SDK (`src/lib/llm-client.ts`); the Agent runs inside a Web Worker on the Vercel AI SDK (`ai` + `@ai-sdk/openai`, `src/lib/agent/ReActRunner.ts`) and tool calls return to the main thread via `postMessage`.
- **Agent subsystem:** `src/lib/agent/` — ReAct runner, agent tools, Zod-validated schemas, "mediate mode" where the agent owns a conversation.
- **UI:** React 18, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui (base-nova), `@xyflow/react` + dagre for the mindmap canvas.
- **Path alias:** `@/` → `./src/` (resolved in both `vite.config.ts` and `vitest.config.ts`).
- **Generation prompts are in Chinese.** Keep them in Chinese when modifying.

## TypeScript & Linting Rules

- `strict: true`, `noUncheckedIndexedAccess: true` — array/object access returns `T | undefined`; always guard.
- `noUnusedLocals: true`, `noUnusedParameters: true` — **compile errors**, not warnings.
- ESLint `@typescript-eslint/no-unused-vars: error` with `argsIgnorePattern: ^_`.
- `react-refresh/only-export-components: warn` (off for `src/components/ui/`).
- **No** `as any`, **no** `// @ts-ignore`, **no** `// @ts-expect-error` without a justifying comment and a linked follow-up.
- Prettier: `semi: false`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: all`, `printWidth: 100`, `endOfLine: auto` (the Windows checkout is CRLF; `auto` keeps both CRLF and LF working).

## Testing

- **Vitest + happy-dom** (`vitest.config.ts`). No jsdom — some DOM APIs differ.
- Tests live in `__tests__/` dirs next to source: `src/lib/__tests__/`, `src/stores/__tests__/`, `src/features/*/__tests__/`.
- `src/test-setup.ts` imports `@testing-library/jest-dom/vitest`.
- IndexedDB fixtures need the real adapter or a focused mock — never `localStorage`.
- `npm test` must pass with no skipped tests unless the skip is documented in the test name.

## Workflow

- **Branch:** work on `opencode`. Never push to `main` directly, never push to remote without explicit user approval.
- **Commits:** Conventional Commits (`feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:`).
- **Version bump:** bump `package.json` `version` **before merging any change that ships code** (`fix` → patch, `feat` → minor, breaking → major). The release workflow derives the GitHub Release tag and the installer file names from this version, so merging new code without a bump silently overwrites the existing release's assets (that is how the `v1.0.0` installers got replaced). Docs / CI / chore-only changes are exempt.
- **OpenSpec:** non-trivial changes go through `openspec/changes/<name>/` with `proposal.md` + `tasks.md` + `specs/`. Skip OpenSpec only for one-line fixes and CI / docs tweaks.
- **PR chain:** open against `opencode`, wait for green CI (`npm ci → tsc --noEmit → eslint → vitest`), get user approval before pushing the merge back to `main`.
- **After PR merge** — sync branches without checking out main:
  ```bash
  git fetch origin && git merge origin/main && git push origin opencode && git branch -f main origin/main
  ```

## Security

- Never commit secrets — `.env` is in `.gitignore`. API keys live in `providerStore`, not in code.
- Mindmap node content is sanitized via `src/lib/html-sanitizer.ts` (DOMPurify) before render. Don't bypass it. Remote images in node HTML are stripped (local-first privacy) and external links are externalised (`target="_blank"`).
- The renderer runs under a CSP (production meta tag + session response header, built by `src/lib/desktop-security.ts`). Don't loosen it — in particular do not add `unsafe-eval` or widen `script-src` without a dedicated security change. Permissions are deny-by-default with `clipboard-sanitized-write` as the only exception.
- Mindmap nodes do **not** carry an AI source annotation. The previous `[源: convId/msgId]` requirement was dropped in the mindmap-shell-v2 refactor; if a future audit / provenance layer is needed it should live in a dedicated store, not on the node.

## Phase-0 scaffolding

- `electron/preload/index.ts` (`window.api`), `src/lib/electron.ts` (renderer-side accessor), `src/types/electron.d.ts`, and `electron/main/updater.ts` (no-op stub) are surfaces reserved for Phase 1. Don't wire them into renderer features without a Phase 1 plan.
- `dsh-plugin/` is a local, untracked experiment. It is not part of the build and is ignored by ESLint / Prettier; never import from it into `src/` or `electron/`.

## Project context

- **Solo project.** Author = reviewer. The `code-reviewer` rein still runs its hard-reject checklist (`as any`, raw `localStorage`, hard-coded keys, etc.) as a self-check, but no second pair of eyes is required. If you later add collaborators, re-tighten that gate.

## Mindmap frontend capability overview

The mindmap UI ships in four engineering waves. Each is locked by
a `feat(mindmap-ui): stage <letter>` commit and has a corresponding
`openspec/specs/mindmap-ui-stage-<letter>/spec.md`.

| Stage | Commit  | Scope                                                                                                                                       |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A1    | bda78e1 | React Flow canvas + dagre LR + collapse / expand + node affordance                                                                          |
| A2    | b5ee851 | Hover path highlight + streaming shimmer + search-match outline                                                                             |
| B     | ec4f5f7 | 3-section header + combobox + drawer + resizable markdown modal                                                                             |
| C     | 0cda8a1 | Path / edge highlight + undo top-bar + outline + search + filter + background switcher + keyboard nav + touch long-press + MiniMap viewport |
| D     | (this)  | Dark theme + CSS variables + animation tokens + `data-pattern` prop + style split + boundary tests + type tightening                        |

### Theme (Stage D)

`useTheme()` (`src/hooks/useTheme.ts`) is a two-mode toggle:
`light` ↔ `dark`. When no preference has been stored yet, the
initial resolve falls back to the OS `prefers-color-scheme`; after
that, the explicit choice wins. It toggles `html.dark` and `html[data-theme]`
together so the same hook serves both shadcn/Tailwind (`html.dark`) and
FlowShell (`[data-theme]`). Persistence is `localStorage` under the key
`progressive-mindmap:theme` — the only UI preference kept there; user
data goes through IndexedDB. The toggle button lives in the mindmap
panel toolbar (data-testid `mindmap-toolbar-theme-toggle`).

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
