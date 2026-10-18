# Cleanup — remove deprecated code paths and align docs with the Electron reality

> Engineering-only change. It deletes implementations that were replaced by
> later stages but never removed, and rewrites the documents that still
> describe them. No product behaviour, data format, or UI changes.

## Why

The repository carries three generations of the same feature:

| Generation | What it did | Status today |
| --- | --- | --- |
| Stage B | full-tree JSON generation (`buildFullMindmapPrompt` → `parseJsonToTree` → `mergeEditedNodes`) | replaced by Agent tool calls; **no production caller** |
| Stage B | `markdown` ⇄ `html` converters (`src/lib/markdown.ts`) | replaced by HTML-only node content (`node-html-content` change) |
| Stage A | single `FlowEdge` component, `useLongPress` hook, `ResizableSeparator` | replaced by `edges/*` strategies, inlined long-press, drawer resize |
| Phase 0 | `BaseAgent` class | replaced by `ReActRunner` |
| Phase 0 | `electron/preload/api.d.ts`, `chat` / `streamChatWithRetry` | superseded by `shared/types.ts` + `streamChat` |

Because they were never deleted, four classes of damage accumulate:

1. **Onboarding / agent confusion** — `AGENTS.md`, `README.md` and
   `CONTRIBUTING.md` still describe the Vite-only SPA, the `merge` operation,
   per-node provenance and a 3-state theme toggle. A new contributor (human or
   agent) implements against the old model and the cleanup cost grows.
2. **Spec drift** — `openspec/specs/mindmap-generation/spec.md` still makes
   `mergeEditedNodes`, `parseJsonToTree` and `mindmapTreeToContext` normative.
   Those symbols are dead; the spec is therefore unenforceable as written.
3. **Misleading gates** — dead modules keep passing tests (`markdown.test.ts`,
   `useLongPress.test.ts`, `base-agent.test.ts`), inflating the suite and
   masking real coverage gaps. `eslint .` also lints untracked local tooling
   (`dsh-plugin/`), so `npm run lint` is red locally while CI is green.
4. **Dead dependencies** — `shadcn`, `electron-updater`, `rehype-highlight`,
   `marked`, `turndown`, `@playwright/test`, `@types/dompurify` are declared but
   never imported.

## What Changes

### 1. Delete replaced implementations (verified zero production callers)

Method: import-graph + per-symbol reference counting over `src/` and `electron/`
(excluding `__tests__`). Every item below has exactly one production occurrence
(its own declaration) and is either a whole file nobody imports or an export
nobody references.

**Files deleted**

- `src/lib/agent/base-agent.ts` (+ its test) — replaced by `ReActRunner.ts`.
- `src/lib/markdown.ts` (+ its test, `src/lib/turndown.d.ts`) — HTML-only nodes.
- `src/components/flow-shell/useLongPress.ts` (+ its test) — inlined in
  `MindMapTree.tsx`.
- `src/components/flow-shell/FlowEdge.tsx` — deprecated shim for `edges/*`.
- `src/features/mindmap/ResizableSeparator.tsx` — superseded by
  `useResizable` / drawer handles.
- `src/types/index.ts` — barrel nobody imports; every consumer deep-imports.
- `electron/preload/api.d.ts` — duplicate of `electron/shared/types.ts` +
  `src/types/electron.d.ts`; never imported.

**Exports removed**

- `src/lib/mindmap-generator.ts`: `buildFullMindmapPrompt`,
  `buildIncrementalPrompt`, `parseJsonToTree`, `jsonNodeToMindMapNode`,
  `findEditedNodes`, `mergeEditedNodes`, `mindmapTreeToContext`. Kept:
  `deriveNodeId` (used by `id.ts` consumers) and `mindmapTreeToFlatContext`
  (used by the agent path).
- `src/lib/llm-client.ts`: `chat`, `streamChatWithRetry`. Kept: `createClient`,
  `streamChat`, `isAbortError`, `fetchModels`, `LLMClientError`.
- `src/lib/db.ts`: `readMigrationTimestamp` (kept `recordMigrationTimestamp`,
  which the mindmap store calls after a successful migration).
- `src/lib/electron.ts`: `isMacOS`. The module itself is kept — it is the
  renderer-side accessor for the intentional preload bridge, now documented as
  Phase-0 scaffolding.
- Type-only: `isV1MindMap` / `isV2MindMap` (`types/mindmap.ts`),
  `ValidatedMindmapOperation` (`agent/schema.ts`), `getAgentScope`
  (`agent/agent-tools.ts`), `readAppliedTheme` (`hooks/useTheme.ts`),
  `NODE_ICON_COMPONENTS` (`lib/node-icon.ts`), `CanvasLayoutWithProvider`
  (`flow-shell/canvas/CanvasLayout.tsx`), `EdgeStyleInput`
  (`lib/edges/types.ts`), `ReadonlyFlowShellNodes` / `ReadonlyFlowShellEdges`
  (`lib/mindmap-flow.ts`), `IpcEventChannelName` / `IpcInvokeChannelName`
  (`electron/shared/types.ts`).
- Tests that covered only removed code are deleted with it; assertions that
  target kept behaviour are untouched.

### 2. Remove dead dependencies

`shadcn` (CLI, not a runtime dep), `electron-updater` (the updater is a
documented Phase-0 no-op), `rehype-highlight`, `marked`, `turndown`,
`@playwright/test` (no config and no specs), `@types/dompurify` (DOMPurify 3
ships its own types). `globals` is imported by `eslint.config.js` but missing
from `devDependencies`; it is added. `package-lock.json` is regenerated.

### 3. Toolchain and repository hygiene

- `eslint.config.js`: ignore `dsh-plugin`, `.omo`, `.codebuddy` so a local
  `npm run lint` matches CI.
- `.prettierignore`: same directories, plus `out` / `release`.
- `.prettierrc`: `"endOfLine": "auto"` so the CRLF working tree produced by
  `core.autocrlf=true` (no `.gitattributes`) stops failing `prettier --check`.
- `.gitignore`: ignore `.codebuddy/`, `.omo/`, `dsh-plugin/` — local tooling and
  an untracked experiment, not part of the build.

### 4. Align documents with the shipped product

- `AGENTS.md`: Electron three-process architecture (not a Vite SPA); commands
  (`electron-vite dev`, dual tsconfig typecheck); DB v6; operation list without
  the non-existent `merge`; agent worker + single write funnel; the two AI SDK
  stacks; theme is light/dark with system only as first-paint fallback; CI and
  desktop CI reality; Phase-0 scaffolding note.
- `README.md` / `README.zh-CN.md`: desktop app framing, corrected operation
  list, removed unimplemented "source tracking / material curation" feature
  claims (moved to roadmap), auto-updater marked as planned, dev instructions
  that match Electron, badge test count updated.
- `CONTRIBUTING.md`: `npm ci`, Electron dev loop, PR against `opencode`,
  typecheck/lint/test gates.
- `openspec/specs`: deltas for `mindmap-generation` (drop the full-rebuild /
  markdown-content / few-shot requirements, describe the agent-tool pipeline)
  and `mindmap-incremental` (correct the `update` signature, add `reparent`).

## Non-goals

- Fixing the defect backlog: cross-conversation agent writes, module-level
  scope race, missing `newParentId` in the Zod schema, unregistered agent undo,
  status-guard wiring, dark theme, move-up/down inversion, CSP — each needs its
  own change.
- Removing the four unused IndexedDB object stores (`providers`,
  `conversations`, `messages`, `mindmaps`). That needs a DB version bump plus a
  data-migration story; deferred to a dedicated change.
- Any formatting sweep. Only the Prettier `endOfLine` setting is touched.

## Capabilities

### Modified Capabilities

- `mindmap-generation` — requirements tied to deleted symbols are removed; the
  capability is restated as "the Agent produces incremental operations from
  conversation material".
- `mindmap-incremental` — `update` operation signature corrected (direct
  `label`/`summary`/`content` fields, no `patch` envelope); requirements that
  referenced the deleted prompt builders are removed. `reparent` is *not*
  documented here: its Zod schema is missing `newParentId`, which is tracked as
  a defect outside this change.

## Impact

- Source: 8 files deleted (7 source + `electron/preload/api.d.ts`); 3 test files
  deleted with the dead code they covered; 1 test file rewritten
  (`mindmap-generator.test.ts` now covers the kept flat-context serializer);
  2 test files trimmed (`node-icon.test.ts`, `ChatPage.test.tsx` mock); 23
  exports removed.
- Dependencies: 7 removed, 1 added. `package-lock.json` is in sync
  (`npm ci` compatible).
- `npm test`: 44 files / 491 tests → 41 files / 457 tests. No test is skipped.
- `eslint .`: 58 problems (48 errors) → 0 errors / 7 warnings (all pre-existing
  React-hooks warnings in untouched components).
- `tsc --noEmit` and `tsc -p electron/tsconfig.json`: clean.
- Diff footprint: ~70 insertions / ~1.3k deletions in code, plus docs and spec
  deltas. Pre-existing unformatted files were deliberately not reformatted
  (68 files remain unformatted project-wide — a formatting sweep is out of
  scope for this change).
- Runtime: no behaviour change — every removed symbol had zero production
  callers (verified by import graph + reference counting).

## Verification

```
npx tsc --noEmit                          # 0 errors
npx tsc --noEmit -p electron/tsconfig.json # 0 errors
npx eslint .                              # 0 errors, 7 pre-existing warnings
npx vitest run                            # 41 files / 457 tests passed
node -e "require('./package-lock.json')"  # lockfile v3, in sync
```
