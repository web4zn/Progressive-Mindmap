## 1. Switch test environment

- [ ] 1.1 Install `jsdom`: `npm install -D jsdom`
- [ ] 1.2 Update `vitest.config.ts`: `environment: 'happy-dom'` → `environment: 'jsdom'`
- [ ] 1.3 Run `npm test` — verify IndexedDB errors gone

## 2. Fix external network dependency

- [ ] 2.1 Update `src/lib/__tests__/llm-client.test.ts` — replace `https://httpstat.in/404` call with `vi.fn()` mock
- [ ] 2.2 Run `npm test` — verify httpstat.in errors gone

## 3. Final verification

- [ ] 3.1 Run `npm test` — all 131 tests pass, zero false errors in output
