import type { MindMapNode } from '@/types/mindmap'

/**
 * Bridge between the (non-React) agent tool layer and the undo timeline
 * owned by `MindMapTree` (`useMindmapHistory`).
 *
 * History lives in the presentation layer on purpose (see
 * `useMindmapHistory`). Agent writes happen in `src/lib/agent/agent-tools.ts`,
 * which has no access to React hooks, so the canvas registers a recorder
 * and the tool layer notifies it with the **pre-write** snapshot. Undo then
 * works uniformly for user edits and AI edits.
 *
 * The recorder is intentionally a single slot: only the mounted canvas can
 * record history, and mounting a second canvas replaces the first one.
 */
export type MindmapHistoryRecorder = (mindmapId: string, tree: MindMapNode[]) => void

let recorder: MindmapHistoryRecorder | null = null

/** Register (or clear, with `null`) the active canvas history recorder. */
export function registerMindmapHistoryRecorder(next: MindmapHistoryRecorder | null): void {
  recorder = next
}

/** Push a pre-write snapshot for an agent-applied change onto the timeline. */
export function recordAgentWrite(mindmapId: string, tree: MindMapNode[]): void {
  recorder?.(mindmapId, tree)
}
