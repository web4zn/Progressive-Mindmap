## 1. Create shared db singleton

- [x] 1.1 Create `src/lib/db.ts` with `getDb()` exporting a lazily-initialized `openDB` singleton, unified upgrade callback creating all 5 object stores

## 2. Update consumers

- [x] 2.1 Update `src/lib/storage.ts` — remove local `openDB` call, import and use `getDb` from `./db`
- [x] 2.2 Update `src/lib/indexeddb-storage-adapter.ts` — remove local `openDB` call, import and use `getDb` from `./db`

## 3. Verify

- [x] 3.1 Run `npx tsc --noEmit` — type check passes
- [x] 3.2 Run `npm test` — all tests pass
- [x] 3.3 Manual smoke test — app loads, data persists across refresh
