/**
 * Mindmap v1 → v2 migration — pure function.
 *
 * Responsibilities:
 *   1. Normalise the `contentType` field — the v2 type only accepts
 *      `'text' | 'html'`. Any `'markdown'` values from older data are
 *      converted to `'text'` (the raw markdown source is readable as
 *      plain text, and we no longer bundle a markdown renderer).
 *   2. Ensure every node has a non-empty `label` (fall back to
 *      `'未命名'`, matching the parser in `mindmap-generator.ts`).
 *   3. Stamp the mindmap with `schemaVersion: 2`.
 *   4. **Drop** any pre-existing `shape` field on the node. The
 *      mindmap v2 ships a single presentation (the rect card); the
 *      user-selectable chip / circle / stadium variants were removed
 *      because they hid body content. The renderer collapses any
 *      stale `shape` value to `rect` via `resolveShapeName`, but
 *      silently dropping the field at the migration boundary keeps
 *      the persisted payload smaller and the node object clean.
 *
 * The function is **idempotent** — running it on an already-v2
 * mindmap is a no-op that returns the same object. This matters
 * because the IDB upgrade callback may fire on a v2 client that was
 * carried over from an older deployment.
 *
 * No side effects, no IDB calls, no React. Test in isolation.
 */
import {
  MINDMAP_SCHEMA_VERSION,
  type MindMap,
  type MindMapNode,
  type MindMapNodeV1,
  type MindMapV1,
} from '@/types/mindmap'

/**
 * Normalise a single node. Recursive over `children`.
 *
 * - `label` falls back to `'未命名'` when empty.
 * - `contentType` is filtered through the v2 whitelist; unknown
 *   values are dropped (renderer treats absence as `'text'`).
 * - `shape` is dropped if present (the v2 node carries no shape
 *   field; the renderer always falls back to the rect card).
 */
function migrateNode(node: MindMapNodeV1, depth: number): MindMapNode {
  const label = node.label?.trim() || '未命名'
  const hasChildren = Array.isArray(node.children) && node.children.length > 0
  void depth

  const migrated: MindMapNode = {
    id: node.id,
    label,
    summary: node.summary ?? '',
    content: node.content,
    children: hasChildren ? node.children.map((c) => migrateNode(c, depth + 1)) : [],
    editedByUser: node.editedByUser ?? false,
  }

  const raw = node.contentType
  if (raw === 'html' || raw === 'text') {
    migrated.contentType = raw
  } else if (raw === 'markdown') {
    // 'markdown' is no longer supported; fall back to 'text' so the
    // raw markdown source remains readable as plain text.
    migrated.contentType = 'text'
  }
  // Any unrecognised contentType value is silently dropped; the
  // renderer treats absence as 'text'.

  return migrated
}

/**
 * Migrate a single mindmap from v1 to v2.
 *
 * Idempotent: if `mindmap.schemaVersion === MINDMAP_SCHEMA_VERSION`,
 * the input is returned unchanged (referentially stable, not cloned).
 */
export function migrateV1ToV2(mindmap: MindMapV1 | MindMap): MindMap {
  // `schemaVersion` only exists on the v2 type, so we read it
  // through a structural read of the key without re-narrowing the
  // input. The triple-cast keeps TS happy while still documenting
  // the contract.
  const schemaVersion = (mindmap as unknown as { schemaVersion?: unknown }).schemaVersion
  if (schemaVersion === MINDMAP_SCHEMA_VERSION) {
    return mindmap as MindMap
  }

  const tree = Array.isArray(mindmap.tree) ? mindmap.tree.map((n) => migrateNode(n, 0)) : []

  return {
    id: mindmap.id,
    title: mindmap.title,
    tree,
    pattern: mindmap.pattern,
    monitoredConversationIds: Array.isArray(mindmap.monitoredConversationIds)
      ? mindmap.monitoredConversationIds
      : [],
    collapsedNodeIds: Array.isArray(mindmap.collapsedNodeIds) ? mindmap.collapsedNodeIds : undefined,
    schemaVersion: MINDMAP_SCHEMA_VERSION,
    createdAt: mindmap.createdAt,
    updatedAt: mindmap.updatedAt,
  }
}

/**
 * Migrate an array of mindmaps. Each element is migrated
 * independently, so a v2 element passes through untouched.
 *
 * The function never throws — a malformed entry is logged and
 * replaced with an empty v2 placeholder so the rest of the dataset
 * is not held hostage by a single bad record.
 */
export function migrateV1ToV2All(mindmaps: ReadonlyArray<MindMapV1 | MindMap>): MindMap[] {
  if (!Array.isArray(mindmaps)) return []
  return mindmaps.map((m) => {
    if (!m || typeof m !== 'object' || !('tree' in m)) {
      console.warn('[mindmap-migration] dropping malformed entry:', m)
      return {
        id: `placeholder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: '(已迁移:空记录)',
        tree: [],
        monitoredConversationIds: [],
        schemaVersion: MINDMAP_SCHEMA_VERSION,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    }
    return migrateV1ToV2(m)
  })
}
