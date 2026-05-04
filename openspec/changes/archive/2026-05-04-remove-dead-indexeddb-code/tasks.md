## 1. Delete dead code

- [ ] 1.1 Delete `src/lib/storage.ts` (288 lines, zero external references)

## 2. Add error handling

- [ ] 2.1 Wrap `createIndexedDBStorage()` operations in try/catch — IndexedDB failures silently fall through, Zustand uses initial state
- [ ] 2.2 Add `console.error` warning when IndexedDB is unavailable

## 3. Verify

- [ ] 3.1 Run `npx tsc --noEmit` — zero errors
- [ ] 3.2 Run `npm test` — all existing tests pass
- [ ] 3.3 Manual smoke test — app loads and functions normally
