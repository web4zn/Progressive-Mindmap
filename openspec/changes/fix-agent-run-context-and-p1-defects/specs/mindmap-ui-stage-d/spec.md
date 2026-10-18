## MODIFIED Requirements

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
