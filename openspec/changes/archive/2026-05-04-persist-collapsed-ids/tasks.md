## 1. Data model

- [ ] 1.1 Add `collapsedNodeIds?: string[]` to `MindMap` type in `src/types/mindmap.ts`

## 2. Store

- [ ] 2.1 Add `setCollapsedNodeIds(id: string, nodeIds: string[])` action to `src/stores/mindmapStore.ts`

## 3. Hook

- [ ] 3.1 Update `useMindmapLayout` in `src/features/mindmap/useMindmapLayout.ts` — read `collapsedNodeIds` from store instead of local `useState`, call `setCollapsedNodeIds` on toggle

## 4. Verify

- [ ] 4.1 Run `npx tsc --noEmit` — zero errors
- [ ] 4.2 Run `npm test` — all tests pass
- [ ] 4.3 Manual test — collapse nodes, refresh, verify state persists
