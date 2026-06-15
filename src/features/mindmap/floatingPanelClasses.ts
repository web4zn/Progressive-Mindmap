/**
 * Shared Tailwind class strings for in-canvas floating panels
 * (the right-side cards anchored to a `position: relative`
 * canvas wrapper). The mindmap's `MindMapOutline` and the new
 * `NodeEditorCard` both inherit from this style — keeping them
 * visually consistent and making future "floating right panel"
 * additions a one-line change.
 *
 * The classes are split into three concerns:
 *
 * - `BASE`: the parts that never change between open / closed
 *   states (position, layering, container shape, theming).
 * - `OPEN`: applied when the panel is visible.
 * - `CLOSED`: applied when the panel is hidden — keeps the
 *   element in the DOM so the slide-in / fade-in animation
 *   can play, but removes it from the accessibility tree and
 *   hit-testing.
 *
 * Both `OPEN` and `CLOSED` carry the same transition spec so
 * React only has to flip the toggled class — no animation
 * flicker on the first frame.
 */

export const FLOATING_PANEL_BASE_CLASSES =
  'absolute top-3 right-3 z-40 flex flex-col rounded-md border border-border ' +
  'bg-popover text-popover-foreground shadow-md overflow-hidden ' +
  'transition-all duration-200 ease-out'

export const FLOATING_PANEL_OPEN_CLASSES = 'opacity-100 translate-y-0 pointer-events-auto'

export const FLOATING_PANEL_CLOSED_CLASSES =
  'opacity-0 -translate-y-2 pointer-events-none'
