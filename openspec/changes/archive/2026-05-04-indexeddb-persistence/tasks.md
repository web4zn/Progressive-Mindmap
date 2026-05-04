## 1. Create IndexedDB Storage Adapter

- [x] 1.1 Create `src/lib/indexeddb-storage-adapter.ts` — `createIndexedDBStorage()` returning `{ getItem, setItem, removeItem }` via `zustand-persist` store
- [x] 1.2 Add unit tests in `src/lib/__tests__/indexeddb-storage-adapter.test.ts`

## 2. Upgrade IndexedDB Database

- [x] 2.1 Update `DB_VERSION` from 4 to 5 in `src/lib/storage.ts`
- [x] 2.2 Add `zustand-persist` store in upgrade callback (oldVersion < 5)

## 3. Update Stores

- [x] 3.1 Update `src/stores/mindmapStore.ts` — add `storage: createJSONStorage(() => createIndexedDBStorage())` to persist config
- [x] 3.2 Update `src/stores/conversationStore.ts` — same
- [x] 3.3 Update `src/stores/providerStore.ts` — same

## 4. Verify

- [x] 4.1 `npm test` — all tests pass (9/9 files, 131/131)
- [x] 4.2 `npm run build` — zero errors
- [ ] 4.3 Manual: create data → refresh → data persists from IndexedDB
