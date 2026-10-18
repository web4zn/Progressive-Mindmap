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
`data-testid="mindmap-toolbar-theme-toggle"`. The button shows the
`Sun` icon when the active theme is `dark` (click to go light)
and the `Moon` icon when the active theme is `light` (click to
go dark).

#### Scenario: Toggle from the panel toolbar

- **WHEN** the user clicks the button with `data-testid="mindmap-toolbar-theme-toggle"`
- **THEN** the theme flips and the icon swaps: `Sun` while the active theme is `dark`, `Moon` while it is `light`
- **AND** `aria-label` / `title` read 「切换到浅色」 in dark mode and 「切换到深色」 in light mode
- **AND** `aria-pressed` is `true` while the active theme is `dark`

### Requirement: CSS variables for colour tokens

All FlowShell colours SHALL be defined as CSS variables on
`[data-theme='light']` and `[data-theme='dark']` blocks in
`src/components/flow-shell/css/theme.css`. The pattern accent
colours SHALL be defined as
`--flow-pattern-{auto|5w1h|tech|pros-cons}` tokens in
`src/index.css` and consumed by FlowShell via
`[data-pattern='...']` rules.

#### Scenario: Theme blocks own every FlowShell colour

- **WHEN** `<html data-theme>` is `light` or `dark`
- **THEN** the matching `[data-theme='...']` block in `src/components/flow-shell/css/theme.css` supplies the FlowShell colour variables
- **AND** no FlowShell rule hard-codes a colour literal outside those blocks

#### Scenario: Pattern accent follows `data-pattern`

- **WHEN** the shell wrapper carries `data-pattern="tech"` (or any other pattern value)
- **THEN** the `.flow-shell[data-pattern='tech']` rule applies the matching `--flow-pattern-tech` accent declared in `src/index.css`

### Requirement: Animation timing tokens

All transition / animation durations SHALL be defined as
`--duration-fast` (120 ms), `--duration-base` (200 ms), and
`--duration-slow` (320 ms) tokens in `src/index.css`. The
shared easing SHALL be `--ease-out` (cubic-bezier(0.16, 1,
0.3, 1)). All `flow-shell` styles SHALL reference these
tokens.

A `prefers-reduced-motion: reduce` rule SHALL zero out the
`--duration-*` tokens.

#### Scenario: FlowShell styles use the duration tokens

- **WHEN** a `flow-shell` rule declares a transition or animation duration
- **THEN** it SHALL reference `var(--duration-fast | --duration-base | --duration-slow)` and `var(--ease-out)`
- **AND** no inline duration literal SHALL be introduced in FlowShell rules

#### Scenario: Reduced motion disables animation

- **WHEN** the OS reports `prefers-reduced-motion: reduce`
- **THEN** the `--duration-*` tokens SHALL resolve to `0ms`, so transitions and animations effectively do not run

### Requirement: `data-pattern` is prop-driven

`FlowShell` SHALL accept a `pattern?: 'auto' | '5w1h' | 'tech'
| 'pros-cons'` prop and set the wrapper's `data-pattern`
attribute from it. The hardcoded `data-pattern="auto"` literal
SHALL be removed.

`MindMapPanel` SHALL mirror the active mindmap's pattern onto
`document.documentElement.dataset.pattern` whenever the active
mindmap changes, so CSS rules outside the React tree can read
it.

#### Scenario: The prop drives the wrapper attribute

- **WHEN** `FlowShell` is rendered with `pattern="pros-cons"`
- **THEN** the shell wrapper SHALL carry `data-pattern="pros-cons"`
- **AND** when the prop is omitted it SHALL fall back to `data-pattern="auto"` at the single prop-driven call site

#### Scenario: Pattern mirrored onto the document root

- **WHEN** the active mindmap's pattern changes
- **THEN** `MindMapPanel` SHALL write it to `document.documentElement.dataset.pattern`
- **AND** CSS outside the React tree SHALL be able to read it from `html[data-pattern]`

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

#### Scenario: Partials and aggregator

- **WHEN** the stylesheet is assembled
- **THEN** `src/components/flow-shell/css/` SHALL contain `theme.css`, `node.css`, `edge.css`, `canvas.css` and `animations.css`
- **AND** `src/components/flow-shell/flow-shell.css` SHALL contain only `@import` lines aggregating those five partials

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

#### Scenario: Boundary cases stay covered

- **WHEN** `npm test` runs `src/lib/__tests__/mindmap-flow.test.ts`
- **THEN** each boundary case listed above SHALL have at least one assertion
- **AND** the `toggleCollapse` assertion SHALL check reference equality is forwarded to every emitted node

### Requirement: 500-node perf budget

`src/lib/__tests__/mindmap-flow.bench.test.ts` SHALL add a
benchmark that flattens a synthetic 500-node balanced tree
within 1 s in happy-dom. The benchmark is `it.skip`-able via
`SKIP_PERF=1`.

#### Scenario: Benchmark stays inside the budget

- **WHEN** `src/lib/__tests__/mindmap-flow.bench.test.ts` flattens a synthetic ~500-node balanced tree
- **THEN** the flatten SHALL complete within the 1 s budget in happy-dom
- **AND** `SKIP_PERF=1` SHALL skip the benchmark without failing the suite
