/**
 * Mindmap v2 → v3 migration — pure function (declaration-only).
 *
 * v3 adds an optional `linkedConversationId` field to `MindMapNode`.
 * Since the field is optional and defaults to `undefined`, existing
 * v2 nodes need no data transformation — the migration stamps
 * `schemaVersion: 3` on the mindmap so future migrations can branch.
 *
 * Idempotent: running on an already-v3 mindmap is a no-op.
 *
 * No side effects, no IDB calls, no React. Test in isolation.
 */
import {
  MINDMAP_SCHEMA_VERSION,
  type MindMap,
  type MindMapV1,
} from '@/types/mindmap'

/**
 * Migrate a single mindmap from v2 to v3.
 *
 * Idempotent: if `mindmap.schemaVersion === MINDMAP_SCHEMA_VERSION`,
 * the input is returned unchanged (referentially stable, not cloned).
 */
export function migrateV2ToV3(mindmap: MindMap | MindMapV1): MindMap {
  const schemaVersion = (mindmap as unknown as { schemaVersion?: unknown }).schemaVersion
  if (schemaVersion === MINDMAP_SCHEMA_VERSION) {
    return mindmap as MindMap
  }

  // The tree is already v2 shape; `linkedConversationId` is optional
  // and undefined by default, so the tree passes through unchanged.
  const migrated = {
    ...mindmap,
    schemaVersion: MINDMAP_SCHEMA_VERSION,
  } as MindMap

  return migrated
}

/**
 * Migrate an array of mindmaps. Each element is migrated
 * independently, so a v3 element passes through untouched.
 */
export function migrateV2ToV3All(
  mindmaps: ReadonlyArray<MindMap | MindMapV1>,
): MindMap[] {
  if (!Array.isArray(mindmaps)) return []
  return mindmaps.map((m) => {
    if (!m || typeof m !== 'object' || !('tree' in m)) {
      console.warn('[mindmap-migration-v3] dropping malformed entry:', m)
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
    return migrateV2ToV3(m)
  })
}
