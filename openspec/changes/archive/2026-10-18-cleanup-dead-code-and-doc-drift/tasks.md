# Tasks — cleanup dead code and doc drift

Legend: `[ ]` pending · `[x]` done. Each task lists the acceptance check.

## 1. Change scaffolding

- [x] `.openspec.yaml` + `proposal.md` + `tasks.md` created.
- [x] Spec deltas written under `specs/mindmap-generation/` and
      `specs/mindmap-incremental/`.

## 2. Dead files removed

- [x] `src/lib/agent/base-agent.ts` + `src/lib/agent/__tests__/base-agent.test.ts`.
- [x] `src/lib/markdown.ts` + `src/lib/__tests__/markdown.test.ts` +
      `src/lib/turndown.d.ts`.
- [x] `src/components/flow-shell/useLongPress.ts` +
      `src/components/flow-shell/__tests__/useLongPress.test.ts`.
- [x] `src/components/flow-shell/FlowEdge.tsx`.
- [x] `src/features/mindmap/ResizableSeparator.tsx`.
- [x] `src/types/index.ts`.
- [x] `electron/preload/api.d.ts`.

## 3. Dead exports removed

- [x] `mindmap-generator.ts`: full/incremental prompt builders, JSON parser,
      edited-node find/merge helpers, `mindmapTreeToContext` and the redundant
      `deriveNodeId` re-export. Kept `mindmapTreeToFlatContext`.
- [x] `llm-client.ts`: `chat`, `streamChatWithRetry`.
- [x] `db.ts`: `readMigrationTimestamp`.
- [x] `electron.ts`: `isMacOS` (module kept as Phase-0 bridge accessor).
- [x] Type-only leftovers: `isV1MindMap`, `isV2MindMap`, `ValidatedMindmapOperation`,
      `getAgentScope`, `readAppliedTheme`, `NODE_ICON_COMPONENTS`,
      `CanvasLayoutWithProvider`, `EdgeStyleInput`, `ReadonlyFlowShellNodes`,
      `ReadonlyFlowShellEdges`, `IpcEventChannelName`, `IpcInvokeChannelName`.
- [x] Tests: removed-symbol describes deleted; `mindmap-generator.test.ts`
      rewritten to cover the kept flat-context serializer; `node-icon.test.ts`
      trimmed; `ChatPage.test.tsx` mock now lists the actual `llm-client`
      exports. Tests for kept behaviour untouched.

## 4. Dependencies and toolchain

- [x] `package.json`: removed `shadcn`, `electron-updater`, `rehype-highlight`,
      `marked`, `turndown`, `@playwright/test`, `@types/dompurify`; added
      `globals` (imported by `eslint.config.js`, previously transitive-only).
- [x] `package-lock.json` regenerated (lockfile v3, 861 entries, `npm ci` in sync).
- [x] `eslint.config.js` ignores `dsh-plugin`, `.omo`, `.codebuddy`, `.mavis`.
- [x] `.prettierignore` adds the same dirs + `out`, `release`.
- [x] `.prettierrc` sets `endOfLine: "auto"` (CRLF working tree no longer fails
      `prettier --check`).
- [x] `.gitignore` ignores `.codebuddy/`, `.omo/`, `dsh-plugin/`.

## 5. Documentation aligned with the shipped product

- [x] `AGENTS.md`: Electron architecture, commands, DB v6, operation list
      without `merge`, two AI stacks, worker write funnel, two-mode theme,
      CI reality, Phase-0 scaffolding note, dsh-plugin note.
- [x] `README.md`: desktop framing, corrected ops list, unimplemented corpus /
      provenance claims moved to Roadmap, updater marked planned, dev
      instructions, badge count 491 → 457. Review pass also corrected the
      node-shape claim (switcher removed), the phantom "3/4/5 depth" setting,
      the pattern-vs-canvas-background conflation, the agent "reparent" claim,
      and the "undo includes AI operations" claim.
- [x] `README.zh-CN.md`: same corrections as `README.md`.
- [x] `CONTRIBUTING.md`: `npm ci`, Electron dev loop, PR target `opencode`,
      lint/typecheck/test gates, project structure includes `electron/`.

## 6. Verification

- [x] `npx tsc --noEmit` → 0 errors.
- [x] `npx tsc --noEmit -p electron/tsconfig.json` → 0 errors.
- [x] `npx eslint .` → 0 errors / 7 warnings (all pre-existing, untouched files).
- [x] `npx vitest run` → 41 files / 457 tests passed, no skips.
- [x] `package-lock.json` parses and is `npm ci`-compatible.
- [x] No remaining reference to any removed symbol (grep over `src/` + `electron/`).
- [x] Removed `@types/dompurify` from the local tree and re-ran typecheck to
      prove DOMPurify 3's bundled types are sufficient.
- [~] Prettier: new/rewritten files are clean. Files that were already
      unformatted before this change were **not** reformatted, to keep the diff
      reviewable (project-wide formatting is a separate task).

## 7. Wrap-up

- [x] `proposal.md` impact figures updated to measured numbers.
- [x] All tasks above checked.
- [x] Local commit on `opencode` (no push — requires explicit approval).
- [x] Archive this change (`openspec archive`) after review; that step merges
      the deltas into `openspec/specs/`.

## 8. Out of scope (tracked separately)

- Cross-conversation agent writes, module-level scope race, missing
  `newParentId` in the operation schema, unregistered agent undo, status guard
  wiring, dark-theme canvas, move-up/down inversion, CSP, unused IndexedDB
  object stores. Each needs its own change.
