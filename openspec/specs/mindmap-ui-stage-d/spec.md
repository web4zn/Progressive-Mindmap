# Mindmap UI — Stage D (dark theme + engineering cleanup)

> Stage D is the **last engineering wave** of the `mindmap-ui`
> series. It does not introduce new user-facing interactions
> beyond a theme toggle button, and it must not change any
> Stage A / B / C behaviour or any data-model / store shape.

## Purpose

Mindmap UI engineering wave D: light/dark theme and canvas consistency, CSS variable tokens, `data-pattern` prop, FlowShell style split, boundary and perf tests.

## Requirements

### Requirement: Light / dark theme

The app SHALL support two user-switchable theme modes: `light` and `dark`.
On first run (no stored choice) the initial mode SHALL follow
`prefers-color-scheme`; after an explicit choice, the stored value SHALL win.
The active theme SHALL be persisted across reloads via
`localStorage['progressive-mindmap:theme']`.

The active theme SHALL be applied by toggling the `.dark` and `.light` classes
on `<html>` (for shadcn / Tailwind v4) together with `html[data-theme]` (for
FlowShell's CSS variable layer). `MindMapPanel` SHALL pass the resolved theme to
`MindMapTree` → `FlowShell`; no component SHALL hard-code a `light` canvas theme.

#### Scenario: Toggle the theme

- **WHEN** the user clicks the theme toggle in the mindmap panel toolbar
- **THEN** the active theme flips, `<html>` gains the corresponding class and loses the other, and the value is written to localStorage

#### Scenario: Reload preserves the theme

- **WHEN** the user reloads the page
- **THEN** the theme from localStorage is applied on first paint (no flash of incorrect theme for users with a stored value)

#### Scenario: System preference on first run

- **WHEN** the user has no stored theme and the OS reports `prefers-color-scheme: dark`
- **THEN** the app comes up in dark mode

#### Scenario: Canvas follows the active theme

- **WHEN** the active theme is `dark`
- **THEN** the mindmap canvas (FlowShell surface, nodes, edges) renders with the dark theme tokens
- **AND** the canvas is not hard-coded to light

#### Scenario: Explicit light on a dark OS

- **WHEN** the OS reports a dark colour scheme but the user has explicitly chosen `light`
- **THEN** the app renders in light mode, including on first paint
- **AND** the OS-preference fallback does not override the explicit choice

### Requirement: Theme toggle button

A theme toggle button SHALL be present in the mindmap panel
toolbar (next to the background switcher), with
`data-testid="mindmap-theme-toggle"`. The button shows the
`Sun` icon when the active theme is `dark` (click to go light)
and the `Moon` icon when the active theme is `light` (click to
go dark).

### Requirement: CSS variables for colour tokens

All FlowShell colours SHALL be defined as CSS variables on
`[data-theme='light']` and `[data-theme='dark']` blocks in
`src/components/flow-shell/css/theme.css`. The pattern accent
colours SHALL be defined as
`--flow-pattern-{auto|5w1h|tech|pros-cons}` tokens in
`src/index.css` and consumed by FlowShell via
`[data-pattern='...']` rules.

### Requirement: Animation timing tokens

All transition / animation durations SHALL be defined as
`--duration-fast` (120 ms), `--duration-base` (200 ms), and
`--duration-slow` (320 ms) tokens in `src/index.css`. The
shared easing SHALL be `--ease-out` (cubic-bezier(0.16, 1,
0.3, 1)). All `flow-shell` styles SHALL reference these
tokens.

A `prefers-reduced-motion: reduce` rule SHALL zero out the
`--duration-*` tokens.

### Requirement: `data-pattern` is prop-driven

`FlowShell` SHALL accept a `pattern?: 'auto' | '5w1h' | 'tech'
| 'pros-cons'` prop and set the wrapper's `data-pattern`
attribute from it. The hardcoded `data-pattern="auto"` literal
SHALL be removed.

`MindMapPanel` SHALL mirror the active mindmap's pattern onto
`document.documentElement.dataset.pattern` whenever the active
mindmap changes, so CSS rules outside the React tree can read
it.

### Requirement: `flow-shell.css` split

`flow-shell.css` SHALL be split into 5 partials under
`src/components/flow-shell/css/`:

- `theme.css` — `[data-theme=...]` + `[data-pattern=...]`
  blocks
- `node.css` — every `.flow-node*` rule
- `edge.css` — edges, handles, MiniMap
- `canvas.css` — background, controls, toolbar
- `animations.css` — every `@keyframes` + duration references

The top-level `flow-shell.css` SHALL become a thin
`@import` aggregator.

### Requirement: `treeToFlowShell` boundary tests

`src/lib/__tests__/mindmap-flow.test.ts` SHALL add boundary
cases covering:
- orphan in `collapsedIds`
- 200-level deep tree
- special characters in node id
- extremely long `label` (10 000 chars)
- extremely long `content` (1 MB)
- multiple roots with deeply nested children
- `content: undefined` for `'html'`-typed node
- unknown pattern string
- `collapsedIds` containing IDs absent from the tree
- `toggleCollapse` forwarded to every node (reference equality)
- explicit `depth` argument (default / negative / large)
- `children: []` vs omitted (same shape)

### Requirement: 500-node perf budget

`src/lib/__tests__/mindmap-flow.bench.test.ts` SHALL add a
benchmark that flattens a synthetic 500-node balanced tree
within 1 s in happy-dom. The benchmark is `it.skip`-able via
`SKIP_PERF=1`.

## Impact

- **UI**: one new icon button (`mindmap-theme-toggle`) in the
  panel toolbar.
- **CSS**: `flow-shell.css` (800 lines) → 5 partials + a 5-line
  aggregator. `index.css` gains ~70 lines of variable
  definitions (including the `prefers-color-scheme: dark` and
  `prefers-reduced-motion: reduce` blocks).
- **Tests**: +12 boundary tests, +1 benchmark, +11 useTheme
  tests. Test count grows from 334 → 358.
- **Code review surface**: every file in the diff is in the
  Stage D allow-list. The new `useTheme` hook is the only new
  module.
- **Performance**: no regression. `treeToFlowShell` is
  unchanged in behaviour; the benchmark test is informational.
