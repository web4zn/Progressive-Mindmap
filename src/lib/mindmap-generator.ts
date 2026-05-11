import type { MindMapNode } from '../types/mindmap'
import { deriveNodeId } from './id'

export { deriveNodeId }

// ─── Mindmap Output Prompt ──────────────────────────────────────────

export function buildFullMindmapPrompt(pattern = 'auto'): string {
  const base = `## 思维导图生成指令

你必须输出JSON格式，包含两个字段：
{
  "answer": "你对用户问题的Markdown格式回答，完整详细",
  "mindmap": {"nodes": [{"label": "概念", "summary": "摘要", "children": [{"label": "子概念", "summary": "...", "children": []}]}]}
}

"mindmap" 字段的规则：
- nodes 通常只包含一个根节点，所有内容在它的 children 下面
- 已有思维导图结构会提供给你——你必须在它的基础上做三件事：
  1. 把本次对话新讨论的具体概念作为子节点加入
  2. 如果已有分支不够详细，用新知识细化它（增加子节点层级）
  3. 已有概念的摘要如果被新知识补充了，更新它
- 标记 [用户编辑] 的节点保持原样不要改动`

  const extras: Record<string, string> = {
    '5w1h': `\n## 知识组织模式：5W1H\n请使用 5W1H 六维度组织知识结构：
- What: 概念定义和本质
- Why: 存在原因和动机
- Who: 相关人物/角色/团队
- When: 时间节点和时机
- Where: 应用场景
- How: 实现方法和步骤`,
    tech: `\n## 知识组织模式：技术概念\n请使用技术概念模式组织知识结构：
- 核心定义和原理
- 使用场景和典型用例
- 与同类方案的对比
- 注意事项和常见陷阱`,
    'pros-cons': `\n## 知识组织模式：优缺点分析\n请使用优缺点分析模式组织知识结构：
- 优点和优势场景
- 缺点和局限性
- 适用场景判断`,
  }

  return base + (extras[pattern] ?? '')
}

// ─── JSON → Tree Parsing ──────────────────────────────────────────

interface JsonNode {
  label?: string
  summary?: string
  content?: string
  contentType?: string
  children?: JsonNode[]
}

function jsonNodeToMindMapNode(
  item: unknown,
  depth = 0,
  maxDepth = Infinity,
  parentLabels: string[] = [],
): MindMapNode {
  const raw = item as JsonNode
  const label = (raw.label ?? '未命名').trim()
  const summary = (raw.summary ?? '').trim()
  const contentType =
    raw.contentType === 'html' || raw.contentType === 'text' ? raw.contentType : undefined
  const content = typeof raw.content === 'string' ? raw.content : undefined
  const children = (raw.children ?? []).map((c: JsonNode) =>
    jsonNodeToMindMapNode(c, depth + 1, maxDepth, [...parentLabels, label || '未命名']),
  )

  return {
    id: deriveNodeId(label, parentLabels),
    label: label || '未命名',
    summary,
    content,
    contentType,
    children: depth < maxDepth ? children : [],
    editedByUser: false,
  }
}

export function parseJsonToTree(jsonString: string): MindMapNode[] {
  const text = jsonString.trim()

  let parsed: { nodes?: unknown[] }
  try {
    parsed = JSON.parse(text) as { nodes?: unknown[] }
  } catch (e) {
    console.warn('[parseJsonToTree] JSON parse failed:', String(e))
    return []
  }

  if (!Array.isArray(parsed.nodes)) {
    console.warn('[parseJsonToTree] parsed.nodes is not an array, type:', typeof parsed.nodes)
    return []
  }

  console.log('[parseJsonToTree] nodes count:', parsed.nodes.length)
  return parsed.nodes.map((n) => jsonNodeToMindMapNode(n))
}

// ─── Edited Node Preservation ──────────────────────────────────────

export function findEditedNodes(nodes: MindMapNode[]): MindMapNode[] {
  const result: MindMapNode[] = []
  for (const node of nodes) {
    if (node.editedByUser) result.push(node)
    result.push(...findEditedNodes(node.children))
  }
  return result
}

export function mergeEditedNodes(
  newTree: MindMapNode[],
  editedNodes: MindMapNode[],
): MindMapNode[] {
  const editedIds = new Set(editedNodes.map((n) => n.id))
  return newTree.map((node) => {
    if (editedIds.has(node.id)) {
      const edited = editedNodes.find((n) => n.id === node.id)
      return edited ?? node
    }
    return { ...node, children: mergeEditedNodes(node.children, editedNodes) }
  })
}

// ─── Mindmap as Context ────────────────────────────────────────────

export function mindmapTreeToContext(tree: MindMapNode[], maxNodes = 200): string {
  if (tree.length === 0) return ''

  const lines: string[] = ['## Knowledge Graph Context', '']

  let count = 0
  function walk(nodes: MindMapNode[], depth: number) {
    for (const node of nodes) {
      if (count >= maxNodes) return
      count++
      const prefix = '#'.repeat(Math.min(depth + 1, 6))
      let line = `${prefix} ${node.label}`
      if (node.summary) {
        line += ` —— ${node.summary}`
      }
      if (node.editedByUser) {
        line += ' [用户编辑]'
      }
      lines.push(line)
      if (node.children.length > 0) {
        walk(node.children, depth + 1)
      }
    }
  }

  walk(tree, 0)

  if (count >= maxNodes) {
    lines.push('', '... (truncated)')
  }

  return lines.join('\n')
}

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

// ─── Incremental Operations Prompt ──────────────────────────────────

export function buildIncrementalPrompt(pattern = 'auto'): string {
  const base = `## 思维导图增量更新指令

根据对话内容和现有脑图，输出增量操作来更新脑图。

输出格式（严格 JSON）：
{
  "operations": [
    {"type": "add_child", "parentId": "n1a2b3c", "label": "新概念", "summary": "描述"},
    {"type": "update", "nodeId": "n2b3c4d", "patch": {"summary": "更新后的摘要"}},
    {"type": "delete_leaf", "nodeId": "n5f6g7h"},
    {"type": "add_root", "label": "新概念", "summary": "描述"}
  ]
}

操作类型说明：
- add_child: 在指定父节点下添加子节点。parentId 必须是已有脑图中的真实 ID
- update: 更新已有节点的 label 或 summary。nodeId 必须是真实 ID
- delete_leaf: 删除无子节点的叶子节点。nodeId 必须是真实 ID
- add_root: 在脑图根层级添加新节点（仅当没有合适的父节点时使用）

规则：
- parentId/nodeId 必须使用现有脑图中提供的真实 ID，不能编造
- 标记 [用户编辑] 的节点不能 update 或 delete，也不要在它下面 add_child
- delete_leaf 只能删除无子节点的叶子
- 重复概念用 update 更新摘要，不需要 add_child
- 如果没有改动，输出 {"operations": []}`

  const extras: Record<string, string> = {
    '5w1h': `\n## 知识组织模式：5W1H\n请使用 5W1H 六维度组织新增的知识：
- What: 概念定义和本质
- Why: 存在原因和动机
- Who: 相关人物/角色/团队
- When: 时间节点和时机
- Where: 应用场景
- How: 实现方法和步骤`,
    tech: `\n## 知识组织模式：技术概念\n请使用技术概念模式组织新增的知识：
- 核心定义和原理
- 使用场景和典型用例
- 与同类方案的对比
- 注意事项和常见陷阱`,
    'pros-cons': `\n## 知识组织模式：优缺点分析\n请使用优缺点分析模式组织新增的知识：
- 优点和优势场景
- 缺点和局限性
- 适用场景判断`,
  }

  return base + (extras[pattern] ?? '')
}
