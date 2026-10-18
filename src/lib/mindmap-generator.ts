/**
 * Mindmap prompt-context serialization.
 *
 * Stage v1 grew a full-rebuild generation pipeline in this module
 * (prompt builder, JSON parser, edited-node merge helper). That path
 * was superseded by the Agent tool loop
 * (`src/lib/agent/agent-tools.ts`) and removed in the
 * `cleanup-dead-code-and-doc-drift` change.
 *
 * What remains is the flat serializer the Agent path actually uses:
 * a depth-indented list that carries each node's stable id so
 * incremental operations can reference real nodes.
 */
import type { MindMapNode } from '../types/mindmap'

// ─── Flat Tree Context (with node IDs for incremental ops) ──────────

export function mindmapTreeToFlatContext(tree: MindMapNode[], maxNodes = 200): string {
  if (tree.length === 0) return '(空白脑图)'

  const lines: string[] = []
  let count = 0

  function walk(nodes: MindMapNode[], depth: number) {
    for (const node of nodes) {
      if (count >= maxNodes) return
      count++
      const indent = '  '.repeat(depth)
      let line = `${indent}[id: ${node.id}] ${node.label}`
      if (node.summary) {
        line += ` —— ${node.summary}`
      }
      if (node.children.length > 0) {
        line += ` (${countChildren(node)} 子节点)`
      }
      if (node.editedByUser) {
        line += ' [用户编辑]'
      }
      lines.push(line)
      walk(node.children, depth + 1)
    }
  }

  walk(tree, 0)

  if (count >= maxNodes) {
    lines.push('... (truncated)')
  }

  return lines.join('\n')
}

function countChildren(node: MindMapNode): number {
  let count = node.children.length
  for (const c of node.children) count += countChildren(c)
  return count
}
