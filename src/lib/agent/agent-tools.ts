import { useMindmapStore } from '@/stores/mindmapStore'
import { useConversationStore } from '@/stores/conversationStore'
import {
  mindmapTreeToFlatContext,
} from '@/lib/mindmap-generator'
import { deriveNodeId } from '@/lib/id'
import type { MindMapNode } from '@/types/mindmap'
import { validateOperations } from './schema'

const LOG = '[🧠 Tools]'

// ─── 辅助: 找到与会话关联的脑图（不是当前打开的） ───
function getMindmapForConversation(
  conversationId: string,
): import('@/types/mindmap').MindMap | null {
  const mindmaps = useMindmapStore.getState().mindmaps
  return mindmaps.find((m) => m.monitoredConversationIds?.includes(conversationId)) ?? null
}

// ─── 工具处理器注册表 ───
export const agentToolHandlers: Record<
  string,
  (args: unknown) => Promise<unknown>
> = {
  readMindmap: async () => {
    console.log(LOG, 'readMindmap 开始')
    const conv = useConversationStore.getState().getActiveConversation()
    if (!conv) {
      console.log(LOG, 'readMindmap: 无活跃会话')
      return { treeContext: '', nodeCount: 0, tree: [] }
    }
    const mm = getMindmapForConversation(conv.id)
    if (!mm || mm.tree.length === 0) {
      console.log(LOG, 'readMindmap: 未找到关联脑图或脑图为空')
      return { treeContext: '', nodeCount: 0, tree: [] }
    }
    const nodeCount = countNodes(mm.tree)
    console.log(LOG, `readMindmap: 读取脑图 "${mm.title}" (${nodeCount} 节点)`)
    return {
      treeContext: mindmapTreeToFlatContext(mm.tree),
      nodeCount,
      tree: mm.tree,
      pattern: mm.pattern ?? 'auto',
    }
  },

  generateMindmapOps: async (args: unknown) => {
    const { operations } = args as {
      operations?: Array<{
        type: string
        parentId?: string
        nodeId?: string
        label?: string
        summary?: string
        patch?: { label?: string; summary?: string }
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
    const newTree = applyOperations(targetMindmap.tree, ops)
    useMindmapStore.getState().updateMindmapTree(targetMindmap.id, newTree)

    console.log(LOG, `✅ "${targetMindmap.title}" 更新: ${countNodes(newTree)} 节点 (${ops.length} 操作)`)
    return { success: true, nodeCount: countNodes(newTree), operations: ops }
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
  let result = structuredClone(tree)

  for (const op of operations) {
    try {
      result = applyOne(result, op)
      // 顶层验证：add_child 操作后检查父节点是否存在
      if (op.type === 'add_child' && op.parentId && !hasNode(result, op.parentId)) {
        console.warn(LOG, `add_child: 未找到父节点 "${op.parentId}"`)
      }
    } catch (err) {
      console.warn(LOG, `跳过操作 ${op.type}: ${String(err)}`)
    }
  }

  return result
}

/**
 * 检查树中是否包含指定 ID 的节点。
 * 用于在 add_child 操作后验证目标父节点是否存在。
 */
function hasNode(nodes: MindMapNode[], nodeId: string): boolean {
  for (const n of nodes) {
    if (n.id === nodeId) return true
    if (n.children.length > 0 && hasNode(n.children, nodeId)) return true
  }
  return false
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
          return {
            ...node,
            label: op.patch.label ?? node.label,
            summary: op.patch.summary ?? node.summary,
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
  return {
    id: op.id || deriveNodeId(op.label, []),
    label: op.label,
    summary: op.summary ?? '',
    children: [],
    editedByUser: false,
  }
}
