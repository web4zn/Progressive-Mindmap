## Context

`progressive-mindmap` is a React 18 + TypeScript application using Vite, Zustand (with localStorage persist), IndexedDB (idb), and Tailwind CSS v4. Mindmaps are generated via LLM from conversation transcripts and displayed as collapsible DOM trees. The current generation flow is:

```
Conversation[] → build prompt → LLM stream → accumulate fullContent → parse to tree → render
```

Key constraints:
- All data lives client-side (IndexedDB + Zustand). No backend.
- MindMap tree is purely read-only (no editing).
- `sourceConversationIds` exists in the data model but is never populated.
- Generation uses streaming but chunks are buffered silently until complete.

## Goals / Non-Goals

**Goals:**
1. Allow users to select specific conversation messages/text as mindmap input instead of full conversations
2. Show real-time tree rendering during generation (streaming preview)
3. Improve generation output quality via prompt engineering and structured constraints
4. Enable node-by-node editing (label, summary, add/delete/move)
5. Populate `sourceConversationIds` with actual source tracking data
6. Support N:N conversation-mindmap relationships

**Non-Goals:**
- Bidirectional links between nodes (deferred to future change)
- Canvas/graph visualization (staying with DOM tree)
- Collaborative editing
- Offline LLM (stays OpenAI-compatible API)

## Decisions

### D1: Material Pool as Zustand Slice

**Choice:** New Zustand store `useMaterialStore` holding `items: MaterialItem[]` where each item has `{ id, conversationId, messageId, selectedText?, addedAt }`.

**Rationale:** Zustand is already the state backbone. A separate store keeps material selection decoupled from both conversation and mindmap stores. Items are ephemeral (not persisted) since they represent transient selection state.

**Alternatives considered:**
- Extending `Conversation` with `selectedRanges: string[]` — couples UI selection to data model, harder to share across multiple mindmaps.
- URL-based selection — over-engineering for a single-page client.

### D2: Streaming Tree Rendering via Incremental Parse

**Choice:** On each chunk, call `parseMarkdownToTree(fullContentAccumulated)` and update the tree via `updateMindmapTree`. Use a debounce of 100ms to avoid excessive re-renders. The `parseMarkdownToTree` function already handles partial/truncated markdown gracefully (ignores non-header lines, stops at depth 3).

**Rationale:** Reuses existing parser. No new dependency. Partial markdown looks like a valid but incomplete tree — users see topics appear in real-time, building trust and reducing perceived wait time.

**Alternatives considered:**
- Streaming JSON (readable stream parsing with incremental JSON parser) — more precise but requires the LLM to output well-formed JSON incrementally, which is fragile.
- Server-Sent Events with structured events — no server exists.

**Progress indicators:** Track `nodeCount` during parsing and `currentDepth`. Display: "已生成 N 个主题 · 深度 2/3".

**Reasoning transparency:** For models supporting `reasoning_content` (deepseek-reasoner, o1 variants), extract and display as collapsible "AI 思考过程" section. This is purely additive — if the model doesn't support it, the field is absent.

### D3: Prompt Optimization Strategy

**Choice:** Three-phase improvement, applied progressively:

**Phase A — Few-shot examples (immediate, low cost):**
Add 1-2 high-quality examples to the system prompt showing the expected structure and style. Example covers both "first generation" and "incremental update" scenarios. Estimated token cost: ~500 extra tokens per request.

**Phase B — Structured output via JSON mode (medium effort):**
Switch from Markdown parsing to JSON output using `response_format: { type: "json_object" }`. The LLM returns a well-formed `{ nodes: [...] }` JSON matching the `MindMapNode[]` shape. Eliminates parsing failures entirely. Requires provider to support JSON mode (OpenAI, DeepSeek compatible).

**Phase C — Quality validation (post-processing):**
After parse, run checks:
- Duplicate detection: same label at same depth → merge or warn
- Empty nodes: label is empty string → remove
- Depth violation: >3 levels → trim
- Breadth violation: >10 children → keep top 10 by specificity
- Coverage check: percentage of input messages referenced (via `sourceConversationIds`)

**Rationale:** Phase A gives immediate lift with zero code change. Phase B eliminates the weakest link (parser fragility). Phase C catches LLM hallucinations before the user sees them.

### D4: Source Tracking Implementation

**Choice:** Pass message metadata to the LLM in the prompt and instruct it to annotate each node with the source conversation/message. The prompt will include:

```
每条消息前标注 [conv-X, msg-Y]。生成节点时标注来源。
输出 JSON 格式：{ "label": "...", "summary": "...", "sourceIds": ["conv-X|msg-Y"], "children": [...] }
```

The parser extracts `sourceIds` and maps them to actual `sourceConversationIds` and stored excerpts. Excerpts are stored in a new `MindMapNode.sourceExcerpts: Record<string, string>` field (conversationId → excerpt text).

**Rationale:** The LLM already has the context to attribute knowledge to sources — we just need to give it the identifiers and output format. No additional LLM call needed.

**Fallback:** If the LLM fails to annotate sources, the system assigns the conversation ID of the most recent message in the input as a fallback.

### D5: Node Editing Architecture

**Choice:** Inline editing with optimistic local state, persisted on blur/Enter. The Zustand store gains three new actions:

```typescript
updateNode(mindmapId, nodeId, patch: {label?, summary?})
addChildNode(mindmapId, parentNodeId)
deleteNode(mindmapId, nodeId)
moveNode(mindmapId, nodeId, newParentId, index?)
```

Nodes edited by the user get `editedByUser: true` and `sourceConversationIds` cleared (since the content is no longer LLM-generated). This marker prevents auto-sync from overwriting user edits.

**Rationale:** Node ID based operations are O(n) traversal (find node in tree), but for expected tree sizes (<500 nodes), this is imperceptible. A Map-based lookup could be added later if needed.

**Alternatives considered:**
- Normalized state (flat node map + parent references) — cleaner for edits but requires significant refactor of the entire data flow (stores, persistence, tree rendering).
- Full CRDT — overkill for single-user local app.

### D6: Conversation-MindMap N:N Relationship

**Choice:** `Conversation.mindmapId?: string` → `Conversation.mindmapIds: string[]`. The migration is straightforward:
1. Read old `mindmapId` field
2. If present, wrap in array: `[mindmapId]`
3. If absent, set to `[]`

**IndexedDB migration:** Bump DB version to 3. In the upgrade handler, iterate all conversations and migrate the field.

**UI impact:** Conversation settings dialog shows multi-select for mindmap association. Sidebar badge shows count of linked mindmaps.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|---|---|---|
| Streaming tree re-renders cause jank with many nodes | UX | Debounce render at 150ms; use `React.memo` on `TreeNode` |
| JSON mode not supported by all providers | Feature gating | Detect capability at provider level; fall back to Markdown parsing |
| LLM fails to produce valid JSON despite JSON mode | Generation failure | Add retry logic (max 2) with simplified prompt on retry |
| `sourceConversationIds` mapping breaks if LLM hallucinates IDs | Wrong attribution | Validate IDs against actual input; strip invalid ones |
| User edits overwritten by auto-sync | Data loss | `editedByUser` flag checked before auto-sync; prompt user to confirm overwrite |
| IndexedDB migration fails on large datasets | Data loss | Migration is non-destructive (read old, write new); old data remains readable |
| N:N mindmap linking complicates auto-sync logic | Spaghetti code | Auto-sync triggers only for the *primary* (first) linked mindmap |

## Open Questions

1. **Material pool persistence**: Should selected items survive page refresh? (Leaning: no — ephemeral selection, similar to clipboard)
2. **Editing undo**: Do we need undo/redo for node edits? (Leaning: P2 — implement basic edit first, add history stack later)
3. **Quality validation severity**: Should warnings block generation or just display alongside results? (Leaning: display alongside, with an "auto-fix" option)
