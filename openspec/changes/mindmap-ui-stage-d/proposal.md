# Mindmap UI — Stage D (dark theme + engineering cleanup)

> Stage D is the **last engineering wave** of the `mindmap-ui` series
> (Stage A = canvas + interactions, B = panel layout, C = path highlight
> / search / filter / MiniMap viewport, **D = dark theme + style
> modularisation + boundary tests + type tightening**). It does not
> introduce new user-facing interactions — only the theme toggle — and
> must not change any Stage A / B / C behaviour or any data-model /
> store shape.

## Why

After Stage C, the project has a working mindmap canvas, panel, search,
filter, and MiniMap viewport indicator, but:

- The dark theme is **partially wired**: `[data-theme='dark']` lives
  inside `flow-shell.css`, not in the global `index.css`; the toggle
  button doesn't exist; and `prefers-color-scheme` is not honoured.
  ShadCN's `.dark` mode is global, but FlowShell paints its own
  variables on `[data-theme=...]` — the two systems do not actually
  agree on background / text in dark mode.
- `flow-shell.css` has grown to ~800 lines and is a single file
  covering theme, node, edge, canvas, animations, and MiniMap
  styles. Hunting for a rule means scanning the entire file.
- `data-pattern="auto"` is **hardcoded** on the `FlowShell` wrapper.
  When the user changes the mindmap's pattern, the edges / handles do
  not recolour until a full re-mount, and there is no way for the
  parent to override.
- `treeToFlowShell` has 8 tests but none of the edge cases called out
  in the Stage A1 spec (orphans, very deep trees, special-character
  IDs, very long content, multi-root, `null` content, unknown
  pattern, `collapsedIds` containing non-existent IDs, etc.).
- The codebase has scattered `as unknown as Record<string, unknown>`
  casts in the canvas / panel code that are no longer needed.

This change closes the loop.

## What Changes

### 1. Dark theme end-to-end
- Add `useTheme()` hook in `src/hooks/useTheme.ts` — reads
  `localStorage('progressive-mindmap:theme')`, falls back to
  `prefers-color-scheme`, and toggles `html.dark`.
- Add a `ThemeToggle` button in `MindMapPanel`'s header (Sun ☀ / Moon
  🌙 glyphs) wired to `useTheme().toggle()`.
- Move the dark-mode CSS variables to `src/index.css` (where ShadCN
  already lives), so any component — not just FlowShell — can use
  `var(--background)` / `var(--foreground)`.
- Wire `prefers-color-scheme: dark` to the same `html.dark` class on
  first paint, so a system-prefers-dark user gets dark on load.
- The theme persists across reloads via `localStorage`.

### 2. CSS variables + animation curves unified
- All animation timings become `var(--duration-fast)` (120ms),
  `var(--duration-base)` (200ms), `var(--duration-slow)` (320ms).
- Easing becomes `var(--ease-out)` (cubic-bezier(0.16, 1, 0.3, 1)).
- `flow-shell.css` references them; `index.css` defines them on
  `:root` and `.dark`.

### 3. `data-pattern` is now prop-driven
- `FlowShell` accepts a `pattern: MindMapPattern` prop
  (`'auto' | '5w1h' | 'tech' | 'pros-cons'`).
- The wrapper's `data-pattern` attribute is set from the prop.
- `MindMapPanel` writes the active mindmap's pattern to
  `document.documentElement.dataset.pattern` whenever it changes; the
  prop is the source of truth and the html dataset is only a CSS
  fallback for elements that live outside the React tree.
- The hardcoded `data-pattern="auto"` on `FlowShell` is removed.
- Pattern colour CSS still maps `[data-pattern='...']` → `--flow-pattern`
  (used for edge / handle / accent colour).

### 4. `flow-shell.css` split into 5 partials
- `theme.css` — CSS variables + `[data-theme=...]` and `[data-pattern=...]` blocks
- `node.css` — `.flow-node*` (card, header, summary, content, controls)
- `edge.css` — edges, handles, MiniMap
- `canvas.css` — `.react-flow__background`, controls, minimap wrap
- `animations.css` — `@keyframes` + duration vars + reduced-motion gates
- `flow-shell.css` becomes a 5-line `@import` aggregator (Vite supports
  `@import` for CSS in dev / build).

### 5. `treeToFlowShell` boundary tests (+10 cases)
Add tests covering:
1. Orphan / dangling parent IDs in collapsed set — child still emitted.
2. 200-level deep tree — depth propagates correctly.
3. Special characters in node ID (`'a/b:c d'` with `escape hatch`).
4. Extremely long `label` (10k chars) — width clamp holds.
5. Extremely long `content` (1 MB string) — no crash, height clamp holds.
6. Multiple roots with deeply nested children — all edges emitted.
7. `content: undefined` for html-type node — `hasHtml` correctly false.
8. Unknown pattern string (`'foo-bar-baz'`) — passed through unchanged.
9. `collapsedIds` containing IDs that don't exist in the tree — no
   crash, no extra nodes.
10. `toggleCollapse` is called exactly once per click (verified via
    `vi.fn()` mock).
11. (bonus) depth=0 explicit, depth=undefined, depth=-1 — handled.
12. (bonus) empty `children: []` vs `children: undefined`-equivalent — same.

### 6. Type tightening in `mindmap-flow.ts` + `FlowShell.tsx`
- Remove `as Node` / `as FlowNodeData` / `as Edge` / `as unknown` casts
  in the Stage D boundary files.
- `treeToFlowShell` returns a single `Result` object with `nodes: ReadonlyArray<...>`
  so callers can iterate without `!` (already mostly the case, formalise).
- `FlowShell`'s `defaultEdgeOptions` and `backgroundVariant` use
  narrowed local types instead of inline `as` casts.

### 7. 500-node perf budget
- Add a benchmark test that builds a synthetic 500-node balanced tree
  and times `treeToFlowShell` plus `applyLayout` end-to-end.
- Soft threshold: 1 s in CI (happy-dom).
- Documented in `__tests__/mindmap-flow.bench.test.ts`.

### 8. Docs
- `AGENTS.md` — add a "Mindmap frontend capability overview" section
  listing Stages A–D.
- `README.md` — add a short "Theme" section explaining
  `html.dark` / system / persistence behaviour.
- `openspec/specs/mindmap-ui-stage-b/`, `-stage-c/`, `-stage-d/`
  spec files under `openspec/specs/` so the spec archive has a
  complete entry for each stage.

## Non-goals

- **No** new UI interactions beyond the theme toggle. Search / filter
  / collapse / drag / reparent / MiniMap click / undo / redo /
  shortcuts all stay exactly as Stage C left them.
- **No** Electron changes. `electron/` is read-only this stage.
- **No** store changes. `mindmapStore` / `chatStore` /
  `conversationStore` shapes are untouched.
- **No** backend / IPC changes.
- **No** colour palette overhaul. We keep Tailwind's neutral
  palette + the four pattern accent colours; we just route them
  through CSS variables.

## Capabilities

### New Capabilities
- `mindmap-theme` — the dark / light / system theme system.

### Modified Capabilities
- `mindmap-canvas-rendering` — explicitly references
  `var(--flow-pattern)` and `var(--background)` instead of inline
  colours; adds the `pattern` prop to `FlowShell`.
- `mindmap-panel-layout` — header gains a theme toggle button.

## Impact

- **UI**: one new icon button in the `MindMapPanel` header. All
  existing components inherit dark mode via CSS variables.
- **CSS**: `flow-shell.css` (800 lines) → 5 partials + a 5-line
  aggregator. `index.css` gains ~20 lines of variable definitions.
- **Tests**: +12 boundary tests, +1 benchmark test. Test count grows
  from 334 → 347+.
- **Code review surface**: every file in the diff is in the allowed
  list (no surprises). The new `useTheme` hook is the only new
  module.
- **Performance**: no regression. `treeToFlowShell` is unchanged in
  behaviour; the benchmark test is informational.
