## Context

Current mindmap generation is a two-phase batch process:

```
User asks -> AI streams answer -> answer complete -> 5s debounce
  -> separate LLM call (stream: false, full/incremental)
  -> parse JSON -> update mindmap tree
```

Problems:
- **Latency**: 10-30s extra wait after chat completes
- **Quality**: One LLM call must read full conversation + extract concepts + build hierarchy + output valid JSON - too many tasks
- **UX gap**: No real-time mindmap growth during conversation
- **Token waste**: Separate generation call re-reads conversation history already seen by chat model
- **Node ID fragility**: Incremental mode requires LLM to output exact node IDs - any mismatch fails silently

The proposal calls for a dual-stream approach where every chat response simultaneously produces both a natural language answer and structured knowledge, with mindmap-as-context replacing raw conversation history for long-term memory.

## Goals / Non-Goals

**Goals:**
- Chat responses carry both Markdown answer and structured knowledge JSON in a single streaming call
- Mindmap updates in real-time as each chat response arrives (no separate generation step)
- Mindmap tree replaces raw conversation history as LLM long-term context (hybrid: tree + last 1-2 raw rounds)
- Merge algorithm handles dedup and path matching (eliminate fragile node ID dependency)
- Graceful fallback when LLM does not output knowledge blocks
- Backward compatible: existing corpus + manual full rebuild still works

**Non-Goals:**
- Realtime streaming of individual knowledge nodes during LLM response (knowledge is extracted only after the complete response)
- Cross-mindmap knowledge linking
- Multi-modal knowledge extraction (images, audio)
- Plugin/extensibility system for custom extractors

## Decisions

### D1: Knowledge block via post-pended delimiter (not interleaved)

**Approach**: The LLM outputs normal Markdown answer text, then appends `<!--KNWL-->...<!--/KNWL-->` at the end.

| Option | Pro | Con |
|--------|-----|-----|
| Post-pended delimiter | Simple, answer streams normally | Knowledge only arrives at end of response |
| Interleaved JSON | Knowledge arrives mid-stream | Complex streaming JSON parser needed |
| Function calling | Structured, reliable | Requires function-calling API, not universal |
| Separate API call | Full streaming, no prompt change | 2x API cost, extra latency |

**Decision**: Post-pended delimiter. The simpler approach wins for v1. Knowledge arriving at end is acceptable since typical response time is 5-15s.

### D2: Algorithmic merge (not LLM-based)

Knowledge blocks from each response are independent. Merging them into the existing mindmap tree is an algorithmic task:
- Match existing tree nodes by `category` path + fuzzy label comparison (edit distance < 0.3)
- Same path + same label -> update node (unless editedByUser)
- Same path + different label -> add as sibling
- Different path + same/similar concept -> treat as independent branch

**Why not LLM**: Tree merge is a deterministic tree operation. Using an LLM would add latency, cost, and potential inconsistency.

### D3: Mindmap-as-context with hybrid strategy

LLM context = mindmap tree serialized as Markdown + last 1-2 raw Q&A rounds.

Rule:
- If mindmap.tree is empty -> pass full raw conversation history (legacy behavior)
- If mindmap.tree is non-empty -> pass tree + last 2 messages

The mindmap tree is serialized as flat Markdown headings (same format as treeToMarkdown()). Token cost: ~8 tokens per node (vs ~50 tokens per raw message).

### D4: Knowledge data model

```typescript
interface KnowledgeNode {
  label: string           // concept name
  category: string[]      // hierarchical path, e.g. ["React", "Hooks"]
  summary: string         // one-line description
  content?: string        // optional Markdown content
  contentType?: text | markdown
}
```

The `category` path replaces fragile deterministic node IDs as the primary location mechanism. This is more robust because:
- LLM can express paths naturally using concept names
- Fuzzy matching allows for minor wording variations
- New paths create new branches, no ID collision

### D5: Fallback strategy

After each chat response, if no `<!--KNWL-->` block is detected in the stream, schedule the existing batch generation flow with a reduced 2s debounce (down from 5s). This ensures backward compatibility with models that do not follow the knowledge extraction instruction.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM does not output knowledge block | No mindmap updates | Fallback to batch generation |
| Knowledge JSON malformed | Parse error, node lost | Try partial parse; fallback to batch for this response only |
| Category path inconsistent across responses | Duplicate branches | Merge algorithm with fuzzy path matching |
| Knowledge extraction distracts from answer quality | Poorer chat responses | A/B test with/without extraction prompt; keep extraction instructions minimal |
| Mindmap serialization in context consumes prompt tokens | Higher per-request cost | Token monitoring; cap at 200 nodes serialized |
| User expects single batch-style generation (all at once) | Confusion with incremental growth | Toast on first dual-stream response explaining real-time updates |
