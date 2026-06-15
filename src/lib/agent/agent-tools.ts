import { useMindmapStore } from '@/stores/mindmapStore'
import { useConversationStore } from '@/stores/conversationStore'
import { deriveNodeId } from '@/lib/id'
import type { MindMapNode } from '@/types/mindmap'
import { validateOperations } from './schema'
import { formatHtml } from '@/lib/html-formatter'

const LOG = '[🧠 Tools]'

// ─── Agent 作用域状态 ───
// 当 `scopeNodeId` 非空时，所有查询工具和操作引擎只对该节点子树可见。
// 外部流程通过 `setAgentScope`/`clearAgentScope` 控制。
let scopeNodeId: string | null = null

/**
 * Set agent query scope to a specific node subtree.
 * All subsequent query tools will only see nodes under this subtree.
 */
export function setAgentScope(nodeId: string): void {
  scopeNodeId = nodeId
}

/**
 * Clear the agent query scope, returning to full-tree visibility.
 */
export function clearAgentScope(): void {
  scopeNodeId = null
}

/**
 * Get the current scope node ID (if any).
 */
export function getAgentScope(): string | null {
  return scopeNodeId
}

/**
 * Given the full tree, return the subtree rooted at the scope node.
 * If no scope is set, return the full tree as-is.
 * Deep-clones to avoid accidental mutation of the store tree.
 */
export function getQueryTree(tree: MindMapNode[]): MindMapNode[] {
  if (!scopeNodeId || tree.length === 0) return tree

  const cloned = JSON.parse(JSON.stringify(tree)) as MindMapNode[]
  const scopeNode = findNodeById(cloned, scopeNodeId)
  if (!scopeNode) {
    // Scope node not found — tree may have changed; fall back to full tree
    return cloned
  }
  return [scopeNode]
}

/**
 * Replace a node in the tree by ID. Returns a new tree array with the
 * replacement applied. If `nodeId` is not found, returns the tree unchanged.
 */
function replaceNodeInTree(
  nodes: MindMapNode[],
  nodeId: string,
  replacement: MindMapNode,
): MindMapNode[] {
  return nodes.map((n) => {
    if (n.id === nodeId) return replacement
    if (n.children.length > 0) {
      return { ...n, children: replaceNodeInTree(n.children, nodeId, replacement) }
    }
    return n
  })
}

/**
 * Apply operations within the scope subtree:
 * 1. Extract the scope node from the full tree
 * 2. Apply operations on the scope node's children
 * 3. Reinsert the updated scope node into the full tree
 *
 * If no scope is set, delegates to `applyOperations` on the full tree.
 */
export function applyScopedOperations(
  tree: MindMapNode[],
  operations: import('@/lib/agent/types').MindmapOperation[],
): MindMapNode[] {
  if (!scopeNodeId) return applyOperations(tree, operations)

  const scopeNode = findNodeById(tree, scopeNodeId)
  if (!scopeNode) {
    console.warn(LOG, 'applyScopedOperations: scope node not found, falling back to full tree')
    return applyOperations(tree, operations)
  }

  // Scope node itself is the context root; wrap in an array so operations
  // that reference the scope node (e.g. add_child with parentId = scopeNodeId)
  // find it as they would in getQueryTree's [scopeNode] view.
  const wrappedTree: MindMapNode[] = [scopeNode]
  const updatedWrapped = applyOperations(wrappedTree, operations)
  const updatedScope = updatedWrapped[0]!
  return replaceNodeInTree(tree, scopeNodeId, updatedScope)
}

// ─── 辅助: 找到与会话关联的脑图（不是当前打开的） ───
function getMindmapForConversation(
  conversationId: string,
): import('@/types/mindmap').MindMap | null {
  const mindmaps = useMindmapStore.getState().mindmaps
  return mindmaps.find((m) => m.monitoredConversationIds?.includes(conversationId)) ?? null
}

// ─── 树遍历辅助函数 ───

export function findNodeById(nodes: MindMapNode[], id: string): MindMapNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children.length > 0) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return null
}

export function findParentNode(
  nodes: MindMapNode[],
  targetId: string,
): { node: MindMapNode; childArray: MindMapNode[]; index: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (!node) continue
    if (node.id === targetId) return null
    for (let j = 0; j < node.children.length; j++) {
      if (node.children[j]!.id === targetId) {
        return { node, childArray: node.children, index: j }
      }
    }
    if (node.children.length > 0) {
      const result = findParentNode(node.children, targetId)
      if (result) return result
    }
  }
  return null
}

export function getAncestorPath(
  nodes: MindMapNode[],
  nodeId: string,
): { id: string; label: string; depth: number }[] {
  function walk(
    ns: MindMapNode[],
    target: string,
    path: { id: string; label: string; depth: number }[],
  ): { id: string; label: string; depth: number }[] | null {
    for (const node of ns) {
      const nextPath = [...path, { id: node.id, label: node.label, depth: path.length }]
      if (node.id === target) return nextPath
      if (node.children.length > 0) {
        const result = walk(node.children, target, nextPath)
        if (result) return result
      }
    }
    return null
  }
  return walk(nodes, nodeId, []) ?? []
}

export function buildSubtree(node: MindMapNode, depth: number): MindMapNode {
  if (depth <= 1) return { ...node, children: [] }
  return {
    ...node,
    children: node.children.map((c) => buildSubtree(c, depth - 1)),
  }
}

export function searchTree(
  nodes: MindMapNode[],
  query: string,
  currentPath: string[],
): { id: string; label: string; summary: string; path: string }[] {
  const results: { id: string; label: string; summary: string; path: string }[] = []
  const lower = query.toLowerCase()
  for (const node of nodes) {
    const nodePath = [...currentPath, node.label]
    if (
      node.label.toLowerCase().includes(lower) ||
      (node.summary ?? '').toLowerCase().includes(lower)
    ) {
      results.push({
        id: node.id,
        label: node.label,
        summary: node.summary ?? '',
        path: nodePath.join(' > '),
      })
    }
    if (node.children.length > 0) {
      results.push(...searchTree(node.children, query, nodePath))
    }
  }
  return results
}

/**
 * Remove a node from the tree by ID (mutates the array in place).
 * Searches recursively through children. Returns true if found and removed.
 */
export function removeNodeFromTree(nodes: MindMapNode[], targetId: string): boolean {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i]!.id === targetId) {
      nodes.splice(i, 1)
      return true
    }
    if (nodes[i]!.children.length > 0) {
      if (removeNodeFromTree(nodes[i]!.children, targetId)) return true
    }
  }
  return false
}

// ─── 工具处理器注册表 ───
export const agentToolHandlers: Record<
  string,
  (args: unknown) => Promise<unknown>
> = {
  generateMindmapOps: async (args: unknown) => {
    const { operations } = args as {
      operations?: Array<{
        type: string
        parentId?: string
        nodeId?: string
        label?: string
        summary?: string
        content?: string
        contentType?: string
      }>
    }

    console.log(LOG, 'generateMindmapOps 收到操作', { count: operations?.length })

    if (!operations || operations.length === 0) {
      console.log(LOG, '空操作列表，跳过')
      return { success: true, nodeCount: 0, operations: [] }
    }

    // ─── Zod schema 校验：拒绝格式错误的 operations ───
    const validation = validateOperations(operations)
    if (!validation.success) {
      console.error(LOG, '操作校验失败:', validation.error)
      return { error: validation.error, success: false }
    }
    const validatedOps = validation.data

    const conv = useConversationStore.getState().getActiveConversation()
    if (!conv) return { error: '无活跃会话' }

    const targetMindmap = getMindmapForConversation(conv.id)
    if (!targetMindmap) return { error: '会话未关联脑图' }

    // 操作已通过 Zod 校验，直接使用
    const ops = validatedOps as import('@/lib/agent/types').MindmapOperation[]

    if (ops.length === 0) {
      console.warn(LOG, '操作列表无有效操作')
      return { success: true, nodeCount: countNodes(targetMindmap.tree), operations: [] }
    }

    console.log(LOG, `应用 ${ops.length} 个操作到 "${targetMindmap.title}"`)
    const newTree = applyScopedOperations(targetMindmap.tree, ops)
    useMindmapStore.getState().updateMindmapTree(targetMindmap.id, newTree)

    console.log(LOG, `✅ "${targetMindmap.title}" 更新: ${countNodes(newTree)} 节点 (${ops.length} 操作)`)
    return { success: true, nodeCount: countNodes(newTree), operations: ops }
  },

  // ─── 节点级查询处理器 ───
  getNodeDetail: async (args: unknown) => {
    const { nodeId } = args as { nodeId: string }
    console.log(LOG, 'getNodeDetail:', nodeId)
    const conv = useConversationStore.getState().getActiveConversation()
    if (!conv) return { error: '无活跃会话' }
    const mm = getMindmapForConversation(conv.id)
    if (!mm) return { error: '会话未关联脑图' }
    const queryTree = getQueryTree(mm.tree)
    const node = findNodeById(queryTree, nodeId)
    if (!node) return { error: `未找到节点: ${nodeId}` }
    return {
      node: {
        id: node.id,
        label: node.label,
        summary: node.summary ?? '',
        content: node.content,
        contentType: node.contentType,
        childCount: node.children.length,
        hasChildren: node.children.length > 0,
        editedByUser: node.editedByUser,
      },
    }
  },

  getChildren: async (args: unknown) => {
    const { nodeId } = args as { nodeId: string }
    console.log(LOG, 'getChildren:', nodeId)
    const conv = useConversationStore.getState().getActiveConversation()
    if (!conv) return { error: '无活跃会话' }
    const mm = getMindmapForConversation(conv.id)
    if (!mm) return { error: '会话未关联脑图' }
    const node = findNodeById(getQueryTree(mm.tree), nodeId)
    if (!node) return { error: `未找到节点: ${nodeId}` }
    return {
      parentLabel: node.label,
      children: node.children.map((c) => ({
        id: c.id,
        label: c.label,
        summary: c.summary ?? '',
        hasChildren: c.children.length > 0,
      })),
    }
  },

  getParent: async (args: unknown) => {
    const { nodeId } = args as { nodeId: string }
    console.log(LOG, 'getParent:', nodeId)
    const conv = useConversationStore.getState().getActiveConversation()
    if (!conv) return { error: '无活跃会话' }
    const mm = getMindmapForConversation(conv.id)
    if (!mm) return { error: '会话未关联脑图' }
    const queryTree = getQueryTree(mm.tree)
    const node = findNodeById(queryTree, nodeId)
    if (!node) return { error: `未找到节点: ${nodeId}` }
    const parentResult = findParentNode(queryTree, nodeId)
    return {
      parent: parentResult
        ? { id: parentResult.node.id, label: parentResult.node.label }
        : null,
    }
  },

  getSiblings: async (args: unknown) => {
    const { nodeId } = args as { nodeId: string }
    console.log(LOG, 'getSiblings:', nodeId)
    const conv = useConversationStore.getState().getActiveConversation()
    if (!conv) return { error: '无活跃会话' }
    const mm = getMindmapForConversation(conv.id)
    if (!mm) return { error: '会话未关联脑图' }
    const queryTree = getQueryTree(mm.tree)
    const node = findNodeById(queryTree, nodeId)
    if (!node) return { error: `未找到节点: ${nodeId}` }
    const parentResult = findParentNode(queryTree, nodeId)
    if (!parentResult) {
      return {
        parent: null,
        siblings: queryTree
          .filter((s) => s.id !== nodeId)
          .map((s) => ({ id: s.id, label: s.label })),
      }
    }
    return {
      parent: { id: parentResult.node.id, label: parentResult.node.label },
      siblings: parentResult.childArray
        .filter((s) => s.id !== nodeId)
        .map((s) => ({ id: s.id, label: s.label })),
    }
  },

  getAncestors: async (args: unknown) => {
    const { nodeId } = args as { nodeId: string }
    console.log(LOG, 'getAncestors:', nodeId)
    const conv = useConversationStore.getState().getActiveConversation()
    if (!conv) return { error: '无活跃会话' }
    const mm = getMindmapForConversation(conv.id)
    if (!mm) return { error: '会话未关联脑图' }
    const path = getAncestorPath(getQueryTree(mm.tree), nodeId)
    if (path.length === 0) return { error: `未找到节点: ${nodeId}` }
    return { path }
  },

  getSubtree: async (args: unknown) => {
    const { nodeId, depth } = args as { nodeId: string; depth?: number }
    console.log(LOG, 'getSubtree:', nodeId)
    const conv = useConversationStore.getState().getActiveConversation()
    if (!conv) return { error: '无活跃会话' }
    const mm = getMindmapForConversation(conv.id)
    if (!mm) return { error: '会话未关联脑图' }
    const node = findNodeById(getQueryTree(mm.tree), nodeId)
    if (!node) return { error: `未找到节点: ${nodeId}` }
    const d = typeof depth === 'number' && depth >= 1 && depth <= 5 ? depth : 2
    const subtree = buildSubtree(node, d)
    return { root: subtree, nodeCount: countNodes([subtree]) }
  },

  searchNodes: async (args: unknown) => {
    const { query } = args as { query: string }
    console.log(LOG, 'searchNodes:', query)
    const conv = useConversationStore.getState().getActiveConversation()
    if (!conv) return { error: '无活跃会话' }
    const mm = getMindmapForConversation(conv.id)
    if (!mm) return { error: '会话未关联脑图' }
    if (!query || query.trim().length === 0) return { matches: [] }
    const matches = searchTree(getQueryTree(mm.tree), query.trim(), [])
    return { matches: matches.slice(0, 20) }
  },
}

function countNodes(nodes: MindMapNode[]): number {
  let count = nodes.length
  for (const n of nodes) count += countNodes(n.children)
  return count
}

// ─── 增量操作应用引擎 ───
export function applyOperations(
  tree: MindMapNode[],
  operations: import('@/lib/agent/types').MindmapOperation[],
): MindMapNode[] {
  let result = [...tree]

  for (const op of operations) {
    try {
      result = applyOne(result, op)
    } catch (err) {
      console.warn(LOG, `跳过操作 ${op.type}: ${String(err)}`)
    }
  }

  return result
}

function addChildToNode(
  node: MindMapNode,
  op: Extract<
    import('@/lib/agent/types').MindmapOperation,
    { type: 'add_child' }
  >,
): MindMapNode {
  if (node.editedByUser) {
    console.warn(LOG, `跳过 add_child: 父节点 "${node.label}" 已被用户编辑`)
    return node
  }
  return { ...node, children: [...node.children, newNodeFromOp(op)] }
}

function applyOne(
  nodes: MindMapNode[],
  op: import('@/lib/agent/types').MindmapOperation,
): MindMapNode[] {
  switch (op.type) {
    case 'add_root':
      return [...nodes, newNodeFromOp(op)]

    case 'add_child': {
      const pid = op.parentId ?? ''

      const tryAdd = (node: MindMapNode): MindMapNode => {
        if (node.id === pid) { return addChildToNode(node, op) }
        if (pid && node.label === pid) { return addChildToNode(node, op) }
        if (node.children.length > 0) {
          return { ...node, children: applyOne(node.children, op) }
        }
        return node
      }

      const result = nodes.map((n, i) => {
        // 无 parentId → 默认第一个根节点
        if (!pid && i === 0 && !n.editedByUser) {
          return addChildToNode(n, op)
        }
        return tryAdd(n)
      })

      return result
    }

    case 'update':
      return nodes.map((node) => {
        if (node.id === op.nodeId) {
          if (node.editedByUser) {
            console.warn(LOG, `跳过 update: 节点 "${node.label}" 已被用户编辑`)
            return node
          }
          const u = op as { label?: string; summary?: string; content?: string; contentType?: 'text' | 'html' }
          const resolvedContentType = u.contentType ?? node.contentType
          const resolvedContent =
            u.content !== undefined
              ? resolvedContentType === 'html'
                ? formatHtml(u.content)
                : u.content
              : node.content
          return {
            ...node,
            label: u.label ?? node.label,
            summary: u.summary ?? node.summary,
            content: resolvedContent,
            contentType: resolvedContentType,
          }
        }
        if (node.children.length > 0) {
          return { ...node, children: applyOne(node.children, op) }
        }
        return node
      })

    case 'delete_leaf':
      return nodes
        .filter((node) => {
          if (node.id === op.nodeId) {
            if (node.children.length > 0) {
              console.warn(LOG, `跳过 delete_leaf: 节点 "${node.label}" 有子节点`)
              return true
            }
            if (node.editedByUser) {
              console.warn(LOG, `跳过 delete_leaf: 节点 "${node.label}" 已被用户编辑`)
              return true
            }
            return false
          }
          return true
        })
        .map((node) => {
          if (node.children.length > 0) {
            return { ...node, children: applyOne(node.children, op) }
          }
          return node
        })

    case 'reparent': {
      const rp = op as import('@/lib/agent/types').MindmapOperation & {
        type: 'reparent'
        nodeId: string
        newParentId: string
      }
      const { nodeId: targetId, newParentId } = rp

      if (targetId === newParentId) {
        console.warn(LOG, `跳过 reparent: 不能将节点移到自身`)
        return nodes
      }

      const targetNode = findNodeById(nodes, targetId)
      if (!targetNode) {
        console.warn(LOG, `跳过 reparent: 未找到节点 "${targetId}"`)
        return nodes
      }
      if (targetNode.editedByUser) {
        console.warn(LOG, `跳过 reparent: 节点 "${targetNode.label}" 已被用户编辑`)
        return nodes
      }
      if (findNodeById(targetNode.children, newParentId)) {
        console.warn(LOG, `跳过 reparent: 不能将节点移到自己的子节点下`)
        return nodes
      }

      const newParent = findNodeById(nodes, newParentId)
      if (!newParent) {
        console.warn(LOG, `跳过 reparent: 未找到目标父节点 "${newParentId}"`)
        return nodes
      }
      if (newParent.editedByUser) {
        console.warn(LOG, `跳过 reparent: 目标父节点 "${newParent.label}" 已被用户编辑`)
        return nodes
      }

      // Deep clone, then do remove + add on the clone
      const cloned = JSON.parse(JSON.stringify(nodes)) as MindMapNode[]
      const clonedTarget = findNodeById(cloned, targetId)
      const clonedParent = findNodeById(cloned, newParentId)
      if (!clonedTarget || !clonedParent) return nodes

      removeNodeFromTree(cloned, targetId)
      clonedParent.children.push(clonedTarget)
      return cloned
    }

    case 'noop':
      return nodes

    default:
      return nodes
  }
}

function newNodeFromOp(
  op: Extract<
    import('@/lib/agent/types').MindmapOperation,
    { type: 'add_child' | 'add_root' }
  >,
): MindMapNode {
  const content =
    op.content && op.contentType === 'html'
      ? formatHtml(op.content)
      : op.content
  return {
    id: op.id || deriveNodeId(op.label, []),
    label: op.label,
    summary: op.summary ?? '',
    content,
    contentType: op.contentType,
    children: [],
    editedByUser: false,
  }
}
