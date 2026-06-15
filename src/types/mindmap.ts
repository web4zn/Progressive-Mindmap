/**
 * Mindmap data model — Stage v2 (mindmap-shell-v2).
 *
 * This module is the single source of truth for the on-disk mindmap shape.
 * Two types live side-by-side:
 *
 *  - `MindMapNodeV1` / `MindMapV1` — the legacy shape that Stage v1 (and
 *    Stage A–D) persisted. Any data found on disk without a
 *    `schemaVersion` field is treated as v1.
 *
 *  - `MindMapNode` / `MindMap`      — the v2 shape. The v2 model adds
 *    optional visual / layout hints on each node (`shape`, `color`,
 *    `position`, `icon`, `tags`) and a `schemaVersion` on the mindmap
 *    itself so future migrations can branch.
 *
 * The v1 → v2 migration is implemented in `@/lib/migration/mindmap-v1-to-v2`
 * and is invoked from the `mindmapStore` `persist` `migrate` hook and
 * from the IDB upgrade callback in `@/lib/db`.
 *
 * `MINDMAP_SCHEMA_VERSION` is the canonical integer — bump it whenever
 * a breaking shape change lands.
 */

export const MINDMAP_SCHEMA_VERSION = 3

// ─── v1 (legacy) ────────────────────────────────────────────────────

/**
 * @deprecated kept only for the migration layer. New code must use
 *             `MindMapNode` (v2).
 */
export interface MindMapNodeV1 {
  id: string
  label: string
  summary: string
  content?: string
  contentType?: 'text' | 'html' | 'markdown'
  children: MindMapNodeV1[]
  editedByUser: boolean
}

/**
 * @deprecated kept only for the migration layer. New code must use
 *             `MindMap` (v2).
 */
export interface MindMapV1 {
  id: string
  title: string
  tree: MindMapNodeV1[]
  pattern?: string
  monitoredConversationIds: string[]
  collapsedNodeIds?: string[]
  createdAt: number
  updatedAt: number
}

// ─── v2 (current) ───────────────────────────────────────────────────

/**
 * The mindmap node carries a single canonical visual presentation.
 * Earlier revisions had a `shape` field with multiple variants
 * (rect / chip / circle / stadium); the user-facing shape switcher
 * was removed in the mindmap-shell-v2 cleanup because the variants
 * hid body content and made the canvas hard to read. The data field
 * is kept as `string | undefined` so legacy persisted data is still
 * loadable — the renderer always falls back to the rect presentation
 * regardless of the stored value.
 */
export type NodeShapeName = 'rect'

/**
 * Edge style names. Three strategies ship by default; the
 * registry lives at `@/lib/edges/registry` (task 2). Unknown
 * strings fall back to `'smoothstep'` at render time.
 */
export type EdgeStyleName = 'smoothstep' | 'bezier' | 'straight'

/**
 * The current mindmap node. v2 adds optional visual / layout hints on
 * top of v1. Every new field is **optional** so an in-place write of a
 * v1 node is a no-op.
 *
 * The node intentionally carries no per-AI-message provenance. If a
 * future audit / traceability layer is needed, it should live in a
 * dedicated store (e.g. a `mindmap-provenance` IndexedDB object
 * store) rather than on the node itself.
 */
export interface MindMapNode {
  id: string
  label: string
  summary: string
  content?: string
  contentType?: 'text' | 'html'
  children: MindMapNode[]
  editedByUser: boolean

  // ── v2 additions ────────────────────────────────────────────────
  /**
   * Per-node colour override (CSS color string). Wins over `pattern`.
   * @deprecated the per-node colour override was never wired into the
   *             UI; kept here only so legacy persisted data still
   *             type-checks. The mindmap-level `pattern` is the only
   *             colour selector that ships.
   */
  color?: string
  /**
   * Pinned layout position, in flow coordinates. When present, the
   * dagre auto-layout preserves this point for the node. Used by the
   * drag-to-reparent flow (Stage A2) and by the "reset position"
   * context-menu action.
   */
  position?: { x: number; y: number }
  /**
   * Explicit icon name. When omitted, the renderer falls back to the
   * `selectNodeIcon` heuristic (5W1H / tech / pros-cons rules).
   */
  icon?: string
  /** Free-form tags. Filterable in the v2 header filter dropdown. */
  tags?: string[]
  /**
   * Wall-clock timestamp of the last write to this node, regardless
   * of who wrote it (AI or user). Filled in lazily on the first v2
   * write; older nodes keep it `undefined`.
   */
  updatedAt?: number

  // ── v3 additions ──────────────────────────────────────────────────
  /**
   * ID of the conversation linked to this node. When set, the node
   * gets a 💬 bubble icon and right-click "Ask LLM" navigates to this
   * conversation instead of creating a new one. The Agent enhancement
   * triggered from this conversation is scoped to this node's subtree.
   */
  linkedConversationId?: string
}

/**
 * The current mindmap. v2 adds `schemaVersion` so we can branch on
 * the persisted shape without a separate version table.
 */
export interface MindMap {
  id: string
  title: string
  tree: MindMapNode[]
  pattern?: string
  monitoredConversationIds: string[]
  collapsedNodeIds?: string[]

  /**
   * The persisted schema version. Absent on disk ⇒ treat as v1 and
   * run the v1 → v2 migration. Present and equal to
   * `MINDMAP_SCHEMA_VERSION` ⇒ skip migration.
   */
  schemaVersion?: number

  createdAt: number
  updatedAt: number
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Type-guard: is this a v2 mindmap (i.e. does it carry the
 * `schemaVersion` field, and is that field equal to the current
 * canonical version)?
 *
 * Note: an older v2 with `schemaVersion === 1` is *not* "v2" by this
 * guard. The migration layer is responsible for normalising those
 * older v2 values forward.
 */
export function isV2MindMap(m: MindMap | MindMapV1): m is MindMap {
  return (m as MindMap).schemaVersion === MINDMAP_SCHEMA_VERSION
}

/**
 * Type-guard: the persisted data is on the v1 shape (no
 * `schemaVersion` field at all). v2 data that hasn't been
 * re-persisted yet will *also* lack the field, so callers must use
 * the migration function rather than relying on this guard alone.
 */
export function isV1MindMap(m: unknown): m is MindMapV1 {
  if (typeof m !== 'object' || m === null) return false
  const obj = m as Record<string, unknown>
  if (!('tree' in obj) || !Array.isArray(obj['tree'])) return false
  return !('schemaVersion' in obj)
}
