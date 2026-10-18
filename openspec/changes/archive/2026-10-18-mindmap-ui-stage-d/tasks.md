# Mindmap UI Stage D — Tasks

> 10 task blocks. Each block is a logical unit the verifier can
> check off independently. **Stage C behaviour, store shapes, and
> Electron code are explicitly out of scope and must not change.**

## 1. Dark theme CSS variables in `index.css`

- [x] 1.1 Add the following tokens to `:root` in `src/index.css`:
  - `--duration-fast: 120ms`
  - `--duration-base: 200ms`
  - `--duration-slow: 320ms`
  - `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`
  - `--flow-pattern-auto: #3b82f6`
  - `--flow-pattern-5w1h: #22c55e`
  - `--flow-pattern-tech: #8b5cf6`
  - `--flow-pattern-pros-cons: #f59e0b`
- [x] 1.2 Add `prefers-color-scheme: dark` rule that mirrors the
  existing `.dark` block (so first-paint dark works without the
  `useTheme` hook being mounted).
- [x] 1.3 Add a `@media (prefers-reduced-motion: reduce)` block that
  zeros all `--duration-*` variables.
- [x] 1.4 Verify `index.css` still has a single `.dark { ... }` block
  with the same `oklch(...)` definitions (no duplication).

## 2. `useTheme` hook

- [x] 2.1 Create `src/hooks/useTheme.ts` exporting
  `useTheme(): { theme: 'light' | 'dark'; setTheme: (t) => void; toggle: () => void }`.
- [x] 2.2 On first render, read `localStorage['progressive-mindmap:theme']`.
  If absent, fall back to
  `window.matchMedia('(prefers-color-scheme: dark)').matches`.
- [x] 2.3 Apply the resolved theme by toggling `html.dark` and
  `data-theme` on `<html>` (both — ShadCN uses `.dark`; FlowShell
  uses `[data-theme=...]`).
- [x] 2.4 On `setTheme` / `toggle`, write the new value back to
  `localStorage` and update `<html>`.
- [x] 2.5 Add `useTheme` tests in `src/hooks/__tests__/useTheme.test.ts`
  covering: default from localStorage, default from prefers, toggle
  flips class, persist across mounts.
- [x] 2.6 The hook must work in happy-dom (mock `matchMedia` and
  `localStorage` if needed).

## 3. `flow-shell.css` split

- [x] 3.1 Create `src/components/flow-shell/css/theme.css` —
  contains the `[data-theme='light']` / `[data-theme='dark']` blocks
  and the `[data-pattern='...']` blocks.
- [x] 3.2 Create `src/components/flow-shell/css/node.css` — every
  `.flow-node*` rule, including the HTML content typography.
- [x] 3.3 Create `src/components/flow-shell/css/edge.css` — edges,
  handles, MiniMap wrap.
- [x] 3.4 Create `src/components/flow-shell/css/canvas.css` —
  `.react-flow__background`, controls, scrollbar.
- [x] 3.5 Create `src/components/flow-shell/css/animations.css` —
  every `@keyframes` + `animation:` rule + reduced-motion gates.
- [x] 3.6 Replace `flow-shell.css` with a 5-line `@import` aggregator:
  ```css
  @import './css/theme.css';
  @import './css/node.css';
  @import './css/edge.css';
  @import './css/canvas.css';
  @import './css/animations.css';
  ```
- [x] 3.7 Replace every `0.18s`, `0.15s`, `0.2s`, `0.3s` literal in
  the split files with `var(--duration-fast | --duration-base | --duration-slow)`.
- [x] 3.8 Replace `0.15s ease`, `0.18s ease`, `0.2s ease-in`,
  `0.2s ease-out` with `var(--duration-base) var(--ease-out)` etc.
- [x] 3.9 Verify the rendered styles are byte-identical for every
  existing class (manual diff via `npx vitest run` + screenshot).

## 4. `FlowShell` accepts a `pattern` prop

- [x] 4.1 Add `pattern?: 'auto' | '5w1h' | 'tech' | 'pros-cons'`
  to `FlowShellProps` in `src/components/flow-shell/FlowShell.tsx`.
- [x] 4.2 Wire the wrapper's `data-pattern` attribute to the prop
  (default to `'auto'` if absent).
- [x] 4.3 Remove the hardcoded `data-pattern="auto"` literal.
- [x] 4.4 The `nodeColorFn` for MiniMap already reads from
  `data.pattern`; keep that path. Verify it still works with the
  new prop.
- [x] 4.5 Type-tighten: drop `as Node` / `as FlowNodeData` casts in
  `FlowShell.tsx`. The `setNodes(layoutResult.nodes as Node[])` is
  replaced with a narrowed `layoutResult.nodes` (no cast).

## 5. `MindMapPanel` wires the active pattern + theme toggle

- [x] 5.1 In `src/features/mindmap/MindMapPanel.tsx`, add a
  `useEffect` that sets
  `document.documentElement.dataset.pattern = activeMindmap?.pattern ?? 'auto'`
  whenever the active mindmap changes.
- [x] 5.2 Add a `useTheme()` call and a `ThemeToggle` button in the
  toolbar row (next to the existing undo / redo / outline / search /
  filter / background buttons). The button shows ☀ in dark mode and
  🌙 in light mode (or vice versa — pick what the spec says).
- [x] 5.3 Add an `aria-label` (e.g. "切换到深色" / "切换到浅色") and
  a `data-testid` (`mindmap-theme-toggle`) so the verifier can target
  it.
- [x] 5.4 Existing toolbar / panel behaviour must not change — the
  toggle is an *additive* button, no removals.

## 6. `treeToFlowShell` boundary tests (+10 cases)

Append to `src/lib/__tests__/mindmap-flow.test.ts`:

- [x] 6.1 Orphan in `collapsedIds` (id not in tree) — no error,
  tree still walks.
- [x] 6.2 200-level deep tree — depth propagates, no stack overflow.
- [x] 6.3 Special characters in id (`'a/b:c d-é_中文'`) — id is
  preserved verbatim, edges still match.
- [x] 6.4 Extremely long label (10_000 chars) — node created, width
  cap respected (tested via `computeNodeSize`).
- [x] 6.5 Extremely long content (1 MB) — no crash, height cap
  respected.
- [x] 6.6 Multiple roots with deeply nested children — every root
  has no parent edge, every child has exactly one parent edge.
- [x] 6.7 `content: undefined` for a `'html'`-type node — `hasHtml`
  is correctly `false` in the data (no broken preview).
- [x] 6.8 Unknown pattern string (`'foo-bar-baz'`) — passed through
  unchanged in `data.pattern`.
- [x] 6.9 `collapsedIds` containing IDs absent from the tree — no
  crash, no extra nodes.
- [x] 6.10 `toggleCollapse` is forwarded to data (verify via
  `vi.fn()` reference equality).
- [x] 6.11 (bonus) `depth` argument defaults to 0, accepts negative
  values, accepts `undefined`-equivalent.
- [x] 6.12 (bonus) `children: []` vs. omitted — same shape, same
  `hasChildren: false`.

## 7. 500-node perf benchmark

- [x] 7.1 Add `src/lib/__tests__/mindmap-flow.bench.test.ts` that
  builds a 500-node balanced tree, runs `treeToFlowShell`, and
  asserts wall-clock < 1 s in happy-dom.
- [x] 7.2 The benchmark is `it.skip`-able via
  `process.env.SKIP_PERF=1` for slow CI environments (with a
  comment explaining the skip).
- [x] 7.3 Run on local dev: report the measured time in
  `deliverable.md`.

## 8. Type tightening (in-scope files only)

- [x] 8.1 In `src/lib/mindmap-flow.ts`:
  - [x] 8.1.1 Remove every `as unknown` / `as any` / `as Node` cast
    that I add. The existing `as Node` (returned from `applyLayout`)
    is *kept* if it can be narrowed — try `Node<FlowNodeData, 'flow'>`
    everywhere first.
  - [x] 8.1.2 Tighten `FlowShellNodes` / `FlowShellEdges` to
    `ReadonlyArray<...>` if it doesn't break the call sites.
- [x] 8.2 In `src/components/flow-shell/FlowShell.tsx`:
  - [x] 8.2.1 Drop the `as Node[]` casts on `setNodes` /
    `setEdges` — narrow the upstream `useState` instead.
  - [x] 8.2.2 Drop the `as FlowNodeData | undefined` in
    `decoratedNodes` if the new type makes it unnecessary.
- [x] 8.3 In `src/components/flow-shell/FlowNode.tsx`:
  - [x] 8.3.1 Tighten the `PatternIcon`'s `name` prop type to
    `NonNullable<ReturnType<typeof selectNodeIcon>>`.
- [x] 8.4 In `src/features/mindmap/MindMapPanel.tsx` (the parts I
  touch):
  - [x] 8.4.1 Replace the `as unknown as Record<string, unknown>` cast
    on `window.__mindmapFocusFirstMatch` with a typed lookup helper.

## 9. Spec files under `openspec/specs/`

- [x] 9.1 Create `openspec/specs/mindmap-ui-stage-b/spec.md`
  (panel layout / combobox / drawer / modal — locked snapshot).
- [x] 9.2 Create `openspec/specs/mindmap-ui-stage-c/spec.md`
  (path highlight, search, filter, MiniMap viewport, undo top-bar).
- [x] 9.3 Create `openspec/specs/mindmap-ui-stage-d/spec.md`
  (this stage — dark theme, CSS vars, animations, data-pattern
  prop, boundary tests).

## 10. Docs + manual verification

- [x] 10.1 In `AGENTS.md`, add a "Mindmap frontend capability
  overview" section listing Stages A → D.
- [x] 10.2 In `README.md`, add a "Theme" section documenting the
  dark / light / system behaviour and where the toggle lives.
- [x] 10.3 Manual verification with `npm run dev`:
  - [x] 10.3.1 Open the app, click the toggle, confirm `<html>` gets
    `.dark` and the canvas / panel / modal all re-paint.
  - [x] 10.3.2 Reload — theme persists.
  - [x] 10.3.3 Set OS theme to dark, clear localStorage, reload —
    the app comes up in dark mode.
  - [x] 10.3.4 Switch a mindmap's pattern from "自动" to "技术概念" —
    the edge colour / handles / MiniMap follow.
- [x] 10.4 Capture two screenshots (light + dark) and attach them to
  `deliverable.md`.
- [x] 10.5 Run the full CI chain:
  - [x] 10.5.1 `npm run typecheck` — pass.
  - [x] 10.5.2 `npm run lint` — pass.
  - [x] 10.5.3 `npm test` — 347+ tests, no regressions.
  - [x] 10.5.4 `npm run build:win` — pass (or `npm run build` if
    Windows-only toolchain is unavailable).
- [x] 10.6 Commit on the `opencode` branch, push, write
  `deliverable.md`.
