# Tasks — long-conversation performance

Legend: `[ ]` pending · `[x]` done.

## 1. Scaffolding

- [x] `proposal.md` + `tasks.md` + `specs/runtime-performance/spec.md`.
- [x] `openspec validate perf-long-conversation --strict` passes.

## 2. Streaming render

- [x] `MessageBubble`: while `status === 'streaming'` render plain
      `whitespace-pre-wrap` text; Markdown only when the message completes.
- [x] Streaming indicator and user/error branches unchanged.

## 3. Streaming persistence

- [x] `useConversation`: store writes while streaming throttled to ~100 ms
      (≤10/s), final content + completion status flushed in one write; abort
      path flushes the accumulated content too.

## 4. Canvas

- [x] `CanvasLayout`: `onlyRenderVisibleElements`.
- [x] `useMindmapLayout`: removed the unused dagre pass (only collapse state
      remains; the canvas runs the single layout).
- [x] `MiniMap`: `ResizeObserver` stored and disconnected on unmount/ref change.

## 5. Bundle

- [x] `electron.vite.config.ts`: renderer `manualChunks` (react / flow+markdown /
      AI SDK). Build output now:
      - entry `index-*.js` **933 kB** (was 2,710 kB)
      - `vendor-react` 742 kB, `vendor-flow` 401 kB, `vendor-markdown` 372 kB,
        `vendor-ai` 252 kB, worker 747 kB

## 6. Verification

- [x] `npx tsc --noEmit` / `npx tsc --noEmit -p electron/tsconfig.json` → 0 errors.
- [x] `npx eslint .` → 0 errors / 7 pre-existing warnings.
- [x] `npx vitest run` → 44 files / **503 tests passed**.
- [x] `npm run build` passes; chunk split verified above.
- [x] `openspec validate perf-long-conversation --strict` passes.
- [x] Version bumped to **1.0.4** per the AGENTS.md rule.

## 7. Wrap-up

- [x] tasks checked; commit + push + PR + merge; archive this change.

## Notes

- Pre-existing unformatted files (`CanvasLayout.tsx`, `MindMapTree.tsx`) were
  intentionally not reformatted — the diff is functional-only.
- Planner's unused dagre removal was verified by grepping its only consumer
  (`MindMapTree` only consumed `collapsedIds` / `toggleCollapse`).
