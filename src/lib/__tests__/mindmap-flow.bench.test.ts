import { describe, it, expect } from 'vitest'
import { treeToFlowShell } from '../mindmap-flow'
import type { MindMapNode } from '../../types/mindmap'

/**
 * Stage D — 500-node performance budget.
 *
 * Builds a synthetic balanced tree of ~500 nodes and times
 * `treeToFlowShell`. The acceptance threshold is 1 s in
 * happy-dom (Stage D spec §7.1).
 *
 * The benchmark is *informational*: a failure does not block CI
 * in the slow path. We `it.skip` it when `SKIP_PERF=1` is set so
 * a developer on a slow laptop (or a CI runner with cold caches)
 * can opt out.
 *
 *   SKIP_PERF=1 npx vitest run mindmap-flow.bench
 *
 * The benchmark also intentionally avoids the dagre `applyLayout`
 * call (which lives in FlowShell) — dagre is heavy and outside
 * the unit under test. We're only asserting on the
 * `treeToFlowShell` half of the pipeline, which is the part
 * Stage D is responsible for.
 */

const NODE_BUDGET = 500
/** Soft threshold. Exceeding this in CI is a regression signal. */
const BUDGET_MS = 1000

function makeNode(overrides: Partial<MindMapNode> = {}): MindMapNode {
  return {
    id: overrides.id ?? 'n0',
    label: overrides.label ?? 'X',
    summary: overrides.summary ?? '',
    content: overrides.content,
    contentType: overrides.contentType,
    children: overrides.children ?? [],
    editedByUser: overrides.editedByUser ?? false,
  }
}

function buildBalancedTree(targetNodes: number): MindMapNode[] {
  // Build a balanced k-ary tree. Pick k so that the total count is
  // close to `targetNodes` without going wildly over.
  // depth-first, every internal node has `k` children; leaves have none.
  const k = 4
  const nextId = (() => {
    let n = 0
    return () => `n${n++}`
  })()

  // Build a queue of internal nodes; each gets `k` children until we hit the budget.
  const roots: MindMapNode[] = []
  const queue: MindMapNode[] = []
  let count = 0
  while (count < targetNodes) {
    const node = makeNode({ id: nextId() })
    count += 1
    if (roots.length === 0) {
      roots.push(node)
    } else {
      const parent = queue.shift() ?? roots[0]!
      parent.children.push(node)
    }
    if (count < targetNodes) {
      queue.push(node)
    }
    // Keep the queue full enough to keep `k` branches alive.
    while (queue.length < k * 2 && count < targetNodes) {
      const filler = makeNode({ id: nextId() })
      const parent = queue[0] ?? roots[0]!
      parent.children.push(filler)
      count += 1
      queue.push(filler)
    }
  }
  return roots
}

describe('treeToFlowShell — Stage D 500-node perf budget', () => {
  const SKIP = process.env['SKIP_PERF'] === '1'

  const runner = SKIP ? it.skip : it

  runner(
    `flattens a ~${NODE_BUDGET}-node balanced tree within ${BUDGET_MS}ms`,
    () => {
      const tree = buildBalancedTree(NODE_BUDGET)
      // Sanity: the builder produced something close to the budget.
      // (We don't pin to exactly 500 — the k-ary loop overshoots
      // by a few nodes, which is fine for the perf measurement.)
      const totalNodes = (() => {
        let n = 0
        const walk = (list: MindMapNode[]) => {
          for (const x of list) {
            n += 1
            walk(x.children)
          }
        }
        walk(tree)
        return n
      })()
      expect(totalNodes).toBeGreaterThanOrEqual(NODE_BUDGET - 10)
      expect(totalNodes).toBeLessThanOrEqual(NODE_BUDGET + 50)

      const t0 = performance.now()
      const { nodes, edges } = treeToFlowShell(tree, new Set(), () => {}, 'auto')
      const elapsed = performance.now() - t0

      // The bench number is informational — surface it on stdout so a
      // developer can correlate it with their dev machine / CI.
      console.log(
        `[bench] treeToFlowShell on ${totalNodes} nodes took ${elapsed.toFixed(1)}ms`,
      )

      // The walker should produce one flow node per MindMapNode and
      // (totalNodes - 1) edges in a connected tree.
      expect(nodes).toHaveLength(totalNodes)
      expect(edges).toHaveLength(totalNodes - 1)
      expect(elapsed).toBeLessThan(BUDGET_MS)
    },
  )
})
