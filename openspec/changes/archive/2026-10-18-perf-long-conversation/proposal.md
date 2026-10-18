# Make long conversations and large mindmaps cheap

> Performance change. Same features, fewer wasted renders/layouts/writes.

## Why

The audit found several per-token / per-change costs that grow with conversation
or mindmap size:

| # | Cost | Evidence |
| --- | --- | --- |
| 1 | Every streaming batch re-parses the whole markdown message — O(n²) over a long answer. | `MessageBubble` renders `<Markdown>` while `status === 'streaming'` |
| 2 | Every streaming batch writes the entire conversations array to Zustand, which schedules a full IndexedDB persist (adapter debounces, but each set re-serialises). | `useConversation` updates the store per ~50-char batch; adapter stringifies whole state |
| 3 | The mindmap canvas renders every node even outside the viewport. | `CanvasLayout` — no `onlyRenderVisibleElements` |
| 4 | Every tree change runs **two** dagre layouts: one in `useMindmapLayout` (whose output nobody reads) and one in `CanvasLayout`. | `useMindmapLayout` calls `getLayoutedFlow`; `MindMapTree` only destructures `collapsedIds` |
| 5 | The renderer is a single ~2.7 MB chunk; no vendor splitting. | `out/renderer/assets/index-*.js` |
| 6 | The MiniMap's `ResizeObserver` is created in a ref callback and never disconnected. | `MiniMap.tsx` `wrapperRef` |

## What Changes

1. **Streaming render:** while a message is streaming it renders as plain
   pre-wrapped text; the completed message renders as Markdown. The streaming
   indicator stays. This bounds per-token work to a text-node update.
2. **Streaming persistence:** store updates during streaming are throttled to
   ≤10/s (and flushed on completion/abort), cutting transient writes ~5–10×.
3. **Canvas windowing:** enable `onlyRenderVisibleElements` on the React Flow
   surface.
4. **Single layout pass:** `useMindmapLayout` no longer runs dagre; it only
   provides collapse state (as its only consumer already used).
5. **Bundle splitting:** the renderer build gets vendor chunks (react, flow,
   markdown, AI SDK) via `manualChunks`.
6. **MiniMap cleanup:** disconnect the observer when the wrapper unmounts.

## Non-goals

- Incremental markdown parsing (plain text while streaming is deliberate).
- Moving dagre off the main thread.
- Virtualising the outline/search panels.
- Persisting messages in a separate store/object store.

## Capabilities

### Modified Capabilities

- New capability `runtime-performance` with requirements for bounded streaming
  render, throttled persistence, canvas windowing, single layout and vendor
  chunking.

## Impact

- Files: `MessageBubble.tsx`, `useConversation.ts`, `CanvasLayout.tsx`,
  `useMindmapLayout.ts`, `MiniMap.tsx`, `electron.vite.config.ts`.
- Tests: existing suites must stay green; no persisted-data change.
