import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { Conversation } from '../types/conversation'
import type { MindMapNode, MindMap, CorpusEntry, IncrementalOperation, ChangeRecord } from '../types/mindmap'
import { generateId, deriveNodeId } from './id'

export { deriveNodeId }

export function buildSystemPrompt(useJsonMode?: boolean, maxDepth = 3): string {
  const base = `你是一个知识提取助手。请根据对话内容生成结构化的思维导图。`

  // Chinese ordinal labels 1-5
  const ordinals = ['', '一', '二', '三', '四', '五']
  const levelLabels = ['', '根主题', '子主题', '细节', '细节', '细节']

  const displayDepth = maxDepth === 0 ? Math.min(3, 5) : Math.min(maxDepth, 5)

  // Build markdown header level descriptions (e.g. "一级标题 # 表示根主题，二级标题 ## 表示子主题")
  const headerParts: string[] = []
  for (let i = 1; i <= displayDepth; i++) {
    headerParts.push(`${ordinals[i]}级标题 ${'#'.repeat(i)} 表示${levelLabels[i]}`)
  }
  const headerDesc = headerParts.join('，')

  const headerExParts: string[] = []
  const exampleCount = maxDepth === 0 ? 3 : maxDepth
  for (let i = 1; i <= exampleCount; i++) {
    headerExParts.push('#'.repeat(i))
  }
  const headerExamples = headerExParts.join(' / ')

  let depthLimitStr: string
  if (maxDepth === 0) {
    depthLimitStr = '深度不做硬性限制。根据内容的知识密度自行判断：表层概念用较少层级，技术细节可以到 4-5 层。不要让无关紧要的细节占据层级。'
  } else if (maxDepth === 1) {
    depthLimitStr = `最大深度为 1 层（#）`
  } else {
    depthLimitStr = `最大深度为 ${maxDepth} 层（${headerExamples}），不超过 ${maxDepth} 层`
  }

  const jsonDepthRule = maxDepth === 0
    ? '深度不做硬性限制。根据内容的知识密度自行判断：表层概念用较少层级，技术细节可以到 4-5 层。不要让无关紧要的细节占据层级'
    : `最大深度为 ${maxDepth} 层`

  const formatRules = useJsonMode
    ? `
输出格式要求（严格遵循）：
- 输出必须是合法的 JSON 对象，包含一个 "nodes" 数组
- 每个节点包含: label (字符串), summary (字符串), children (节点数组)
- ${jsonDepthRule}，每个节点下最多 10 个直接子节点
- 只包含对话中明确讨论过的主题，不要编造内容
- 标题简洁明了，控制在 20 字以内
- 优先提取概念性、方法论类知识，而非琐碎的操作细节
- 每个节点需要标注知识来源，在 label 中包含 [源: convId/msgId]
- 输出格式: { "nodes": [{ "label": "概念 [源: abc/123]", "summary": "描述", "children": [...] }] }`
    : `
输出格式要求（严格遵循）：
- 必须使用 Markdown 标题语法：${headerDesc}，**禁止使用列表符号（如 - 或 * 或数字）作为层级标记**
- 每个标题后可跟一句简短摘要（1-2句话）
- 标题与摘要之间用 —— 分隔。示例：## useState —— React 中最基础的状态 Hook
- ${depthLimitStr}
- 每个节点下最多 10 个直接子节点
- 只包含对话中明确讨论过的主题，不要编造内容
- 标题简洁明了，控制在 20 字以内
- 优先提取概念性、方法论类知识，而非琐碎的操作细节
- 每个节点需要标注知识来源。在节点标题后用 [源: convId/msgId] 标注`

  const examples = useJsonMode
    ? `
## 示例输出

{ "nodes": [{ "label": "前端状态管理 [源: abc/123]", "summary": "前端应用中管理UI状态的方法和模式", "children": [
  { "label": "本地状态", "summary": "组件内部的状态管理", "children": [
    { "label": "useState [源: abc/123, def/456]", "summary": "React中最基础的状态Hook", "children": [] },
    { "label": "useReducer [源: def/456]", "summary": "适用于复杂状态逻辑", "children": [] }
  ]}
]}] }`
    : `
## 示例输出

以下是一个高质量输出的范例（主题：前端状态管理）：

# 前端状态管理 [源: abc/123] —— 前端应用中管理UI状态的方法和模式

## 本地状态 —— 组件内部的状态管理
### useState [源: abc/123, def/456] —— React中最基础的状态Hook，适用于简单值
### useReducer [源: def/456] —— 适用于复杂状态逻辑，类似Redux模式

## 全局状态 —— 跨组件共享的状态管理方案
### Context API —— React内置的轻量级状态共享机制
### Zustand —— 轻量级外部状态库，基于发布订阅模式`

  const guidance: string[] = []
  if (maxDepth === 0 || maxDepth >= 3) {
    guidance.push('根节点应概括整体话题')
    guidance.push('二级节点按概念维度分类，不是按时间顺序罗列')
    guidance.push('三级节点提供具体的技术名称或关键要点')
  } else if (maxDepth === 2) {
    guidance.push('根节点应概括整体话题')
    guidance.push('二级节点按概念维度分类，提供具体的技术名称或关键要点，不是按时间顺序罗列')
  } else {
    guidance.push('根节点应概括整体话题，包含具体的技术名称或关键要点')
  }
  guidance.push('如果对话内容较少，宁少勿滥，不必填满深度和广度限制')

  return `${base}${formatRules}${examples}

注意要点：
${guidance.map(g => `- ${g}`).join('\n')}`
}

export function buildMindmapPrompt(
  existingTree: MindMapNode[] | null,
  conversations: Conversation[],
  materialContent?: string,
  useJsonMode?: boolean,
  maxDepth = 3
): {
  systemPrompt: string
  userMessage: string
  sourceMap: Map<string, { conversationId: string; messageId: string; text: string }>
} {
  const systemPrompt = buildSystemPrompt(useJsonMode, maxDepth)
  const sourceMap = new Map<string, { conversationId: string; messageId: string; text: string }>()

  let userMessage = ''

  if (existingTree && existingTree.length > 0) {
    userMessage += '以下是现有的思维导图结构：\n\n'
    userMessage += treeToMarkdown(existingTree)
    userMessage += '\n\n---\n\n'
    userMessage += '请基于以下新的内容更新思维导图。合并新知识点，扩充已有主题，输出完整的更新后 JSON：\n\n'
  } else {
    userMessage += '请基于以下内容生成思维导图：\n\n'
  }

  if (materialContent) {
    userMessage += materialContent
  } else {
    const recentConversations = conversations.slice(-10)
    for (const conv of recentConversations) {
      userMessage += `### 会话: ${conv.title}\n\n`
      for (const msg of conv.messages) {
        if (msg.role === 'system') continue
        const role = msg.role === 'user' ? '用户' : 'AI'
        const srcKey = `${conv.id}/${msg.id.slice(0, 8)}`
        const content = msg.content.length > 2000 ? msg.content.slice(0, 2000) + '...' : msg.content
        userMessage += `[src:${srcKey}] **${role}**: ${content}\n\n`
        sourceMap.set(srcKey, { conversationId: conv.id, messageId: msg.id, text: content.slice(0, 200) })
      }
      userMessage += '---\n\n'
    }
  }

  return { systemPrompt, userMessage, sourceMap }
}

export function parseMarkdownToTree(
  markdown: string,
  sourceMap?: Map<string, { conversationId: string; messageId: string; text: string }>,
  maxDepth = 3
): MindMapNode[] {
  const lines = markdown.split('\n')
  const roots: MindMapNode[] = []
  const stack: { depth: number; node: MindMapNode }[] = []
  const headerRe = new RegExp('^(#{1,' + maxDepth + '})\\s+(.+)')

  let pendingSummary = ''

  for (const line of lines) {
    const headerMatch = line.match(headerRe)
    if (!headerMatch) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
        if (pendingSummary) {
          pendingSummary += ' ' + trimmed
        } else {
          pendingSummary = trimmed
        }
      }
      continue
    }

    const depth = headerMatch[1]?.length ?? 1
    const titleText = headerMatch[2]?.trim() ?? ''

    let label = titleText
    let summary = ''

    const sepIndex = titleText.indexOf('——')
    if (sepIndex !== -1) {
      label = titleText.slice(0, sepIndex).trim()
      summary = titleText.slice(sepIndex + 2).trim()
    }

    const sourceIds = parseSourceIds(label, sourceMap)
    const sourceExcerpts = buildSourceExcerpts(sourceIds, sourceMap)

    pendingSummary = ''

    const parentPath = stack.map(s => s.node.label)

    const node: MindMapNode = {
      id: deriveNodeId(label, parentPath),
      label: stripSourceAnnotations(label) || label || titleText,
      summary: stripSourceAnnotations(summary),
      children: [],
      sourceConversationIds: sourceIds,
      sourceExcerpts,
      editedByUser: false,
    }

    while (stack.length > 0) {
      const top = stack[stack.length - 1]
      if (!top || top.depth < depth) break
      stack.pop()
    }

    if (stack.length === 0) {
      roots.push(node)
    } else {
      const parent = stack[stack.length - 1]
      if (parent && parent.node.children.length < 10) {
        parent.node.children.push(node)
      }
    }

    if (depth < maxDepth) {
      stack.push({ depth, node })
    }
  }

  return roots
}

function parseSourceIds(
  text: string,
  sourceMap?: Map<string, { conversationId: string; messageId: string; text: string }>
): string[] {
  const sourceMatch = text.match(/\[源:\s*([^\]]+)\]/)
  if (!sourceMatch || !sourceMap) {
    // Fallback: return first available conversation ID
    if (sourceMap && sourceMap.size > 0) {
      const firstEntry = sourceMap.values().next().value
      return firstEntry ? [firstEntry.conversationId] : []
    }
    return []
  }
  const keys = sourceMatch[1]?.split(',').map(k => k.trim()) ?? []
  const ids = new Set<string>()
  for (const key of keys) {
    const entry = sourceMap.get(key)
    if (entry) ids.add(entry.conversationId)
  }
  return ids.size > 0 ? [...ids] : []
}

function stripSourceAnnotations(text: string): string {
  return text.replace(/\s*\[源:\s*[^\]]+\]\s*/g, '').trim()
}

function buildSourceExcerpts(
  sourceIds: string[],
  sourceMap?: Map<string, { conversationId: string; messageId: string; text: string }>
): Record<string, string> {
  if (!sourceMap) return {}
  const excerpts: Record<string, string> = {}
  for (const [, entry] of sourceMap) {
    if (sourceIds.includes(entry.conversationId)) {
      excerpts[entry.conversationId] = entry.text.slice(0, 200)
    }
  }
  return excerpts
}

export function countNodes(nodes: MindMapNode[]): number {
  let count = 0
  for (const node of nodes) {
    count++
    count += countNodes(node.children)
  }
  return count
}

export function maxTreeDepth(nodes: MindMapNode[], currentDepth = 1): number {
  if (nodes.length === 0) return 0
  let max = currentDepth
  for (const node of nodes) {
    if (node.children.length > 0) {
      const childMax = maxTreeDepth(node.children, currentDepth + 1)
      if (childMax > max) max = childMax
    }
  }
  return max
}

export interface ValidationWarning {
  type: 'duplicate' | 'empty-label' | 'depth-exceeded' | 'breadth-exceeded'
  nodeLabel: string
  message: string
}

export function validateTree(nodes: MindMapNode[], maxDepth = 3): ValidationWarning[] {
  const warnings: ValidationWarning[] = []
  const seenLabels = new Set<string>()

  function walk(nodeList: MindMapNode[], depth: number, parentLabel: string) {
    for (const node of nodeList) {
      if (!node.label || node.label.trim() === '') {
        warnings.push({
          type: 'empty-label',
          nodeLabel: '(空)',
          message: `在"${parentLabel}"下发现空节点，已自动移除`,
        })
        continue
      }

      const key = `${depth}:${node.label}`
      if (seenLabels.has(key)) {
        warnings.push({
          type: 'duplicate',
          nodeLabel: node.label,
          message: `在"${parentLabel}"下发现重复节点"${node.label}"`,
        })
      } else {
        seenLabels.add(key)
      }

      if (depth >= maxDepth && node.children.length > 0) {
        warnings.push({
          type: 'depth-exceeded',
          nodeLabel: node.label,
          message: `节点"${node.label}"超过最大深度${maxDepth}层，子节点已截断`,
        })
      }

      if (node.children.length > 10) {
        warnings.push({
          type: 'breadth-exceeded',
          nodeLabel: node.label,
          message: `节点"${node.label}"超过最大子节点数10个，已保留前10个`,
        })
      }

      if (depth < maxDepth) {
        walk(node.children, depth + 1, node.label)
      }
    }
  }

  walk(nodes, 1, '根')
  return warnings
}

export function treeToMarkdown(nodes: MindMapNode[], depth = 0): string {
  const lines: string[] = []
  const prefix = '#'.repeat(Math.min(depth + 1, 6))

  for (const node of nodes) {
    let line = `${prefix} ${node.label}`
    if (node.summary) {
      line += ` —— ${node.summary}`
    }
    lines.push(line)

    if (node.children.length > 0 && depth < 2) {
      lines.push(treeToMarkdown(node.children, depth + 1))
    }
  }

  return lines.join('\n')
}

export function conversationMessagesToHistory(conversations: Conversation[]): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = []

  for (const conv of conversations.slice(-10)) {
    for (const msg of conv.messages) {
      if (msg.role === 'system') continue
      const content = msg.content.length > 2000 ? msg.content.slice(0, 2000) + '...' : msg.content
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content,
      })
    }
  }

  return messages
}

interface JsonNode {
  label?: string
  summary?: string
  children?: JsonNode[]
}

function jsonNodeToMindMapNode(
  item: unknown,
  sourceMap?: Map<string, { conversationId: string; messageId: string; text: string }>,
  depth = 0,
  maxDepth = 3,
  parentLabels: string[] = []
): MindMapNode {
  const raw = item as JsonNode
  const label = (raw.label ?? '未命名').trim()
  const summary = (raw.summary ?? '').trim()
  const cleanLabel = stripSourceAnnotations(label)
  const sourceIds = parseSourceIds(label, sourceMap)
  const sourceExcerpts = buildSourceExcerpts(sourceIds, sourceMap)
  const children = (raw.children ?? []).slice(0, 10).map((c: JsonNode) => jsonNodeToMindMapNode(c, sourceMap, depth + 1, maxDepth, [...parentLabels, cleanLabel || '未命名']))

  return {
    id: deriveNodeId(label, parentLabels),
    label: cleanLabel || '未命名',
    summary: stripSourceAnnotations(summary),
    children: depth < (maxDepth ?? 3) ? children : [],
    sourceConversationIds: sourceIds,
    sourceExcerpts,
    editedByUser: false,
  }
}

export function parseJsonToTree(
  jsonString: string,
  sourceMap?: Map<string, { conversationId: string; messageId: string; text: string }>,
  maxDepth = 3
): MindMapNode[] {
  let parsed: { nodes?: unknown[] } = {}
  try {
    const jsonMatch = jsonString.match(/\{[\s\S]*"nodes"[\s\S]*\}/)
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]) as { nodes?: unknown[] }
    } else {
      parsed = JSON.parse(jsonString) as { nodes?: unknown[] }
    }
  } catch {
    return parseMarkdownToTree(jsonString, sourceMap, maxDepth)
  }

  if (!Array.isArray(parsed.nodes)) {
    return parseMarkdownToTree(jsonString, sourceMap, maxDepth)
  }

  return parsed.nodes.map((n) => jsonNodeToMindMapNode(n, sourceMap, 0, maxDepth))
}

export function collectCorpusContent(
  corpus: CorpusEntry[],
  conversations: Conversation[]
): { content: string; sourceMap: Map<string, { conversationId: string; messageId: string; text: string }> } {
  const sourceMap = new Map<string, { conversationId: string; messageId: string; text: string }>()
  const parts: string[] = []

  for (const entry of corpus) {
    if (!entry.enabled) continue
    let msg: Conversation['messages'][number] | undefined
    let convId = ''
    let conv: Conversation | undefined
    for (const c of conversations) {
      const found = c.messages.find(m => m.id === entry.messageId)
      if (found) {
        msg = found
        convId = c.id
        conv = c
        break
      }
    }
    if (!msg || !conv) continue

    const text = entry.selectedText ?? msg.content
    const role = msg.role === 'user' ? '用户' : 'AI'
    const srcKey = `${convId}/${entry.messageId.slice(0, 8)}`

    let contextLine = ''
    if (msg.role === 'assistant') {
      const msgIndex = conv.messages.indexOf(msg)
      const prevMsg = msgIndex > 0 ? conv.messages[msgIndex - 1] : null
      if (prevMsg && prevMsg.role === 'user') {
        const prevText = prevMsg.content.length > 500 ? prevMsg.content.slice(0, 500) + '...' : prevMsg.content
        contextLine = `**用户**: ${prevText}\n`
      }
    }

    parts.push(`${contextLine}[src:${srcKey}] **${role}**: ${text}`)
    sourceMap.set(srcKey, { conversationId: convId, messageId: entry.messageId, text: text.slice(0, 200) })
  }

  return { content: parts.join('\n\n'), sourceMap }
}

export function buildIncrementalPrompt(
  existingTree: MindMapNode[],
  conversations: Conversation[],
  materialContent?: string,
): { systemPrompt: string; userMessage: string } {
  const systemPrompt = '你是一个知识图谱增量编辑助手。分析现有图谱和新内容之间的差异，输出需要修改的操作。'

  let userMessage = '## 现有图谱\n\n'
  userMessage += treeToMarkdown(existingTree)
  userMessage += '\n\n### 节点ID映射\n\n'
  const allNodes = flattenTree(existingTree)
  for (const node of allNodes) {
    userMessage += `- "${node.label}" → \`${node.id}\`\n`
  }

  userMessage += '\n\n---\n\n'
  userMessage += '## 新内容\n\n'

  if (materialContent) {
    userMessage += materialContent
  } else {
    const recentConversations = conversations.slice(-10)
    for (const conv of recentConversations) {
      userMessage += `### 会话: ${conv.title}\n\n`
      for (const msg of conv.messages) {
        if (msg.role === 'system') continue
        const role = msg.role === 'user' ? '用户' : 'AI'
        const content = msg.content.length > 2000 ? msg.content.slice(0, 2000) + '...' : msg.content
        userMessage += `**${role}**: ${content}\n\n`
      }
      userMessage += '---\n\n'
    }
  }

  userMessage += `\n## 输出要求

输出 JSON 格式，包含 "analysis" 和 "operations" 字段：

{
  "analysis": "分析摘要，说明需要修改的原因",
  "operations": [
    { "op": "add_child", "parent_id": "节点ID", "node": { "label": "新节点标签", "summary": "新节点摘要" } },
    { "op": "update", "node_id": "节点ID", "changes": { "label": "新标签", "summary": "新摘要" } },
    { "op": "merge", "from_id": "源节点ID", "to_id": "目标节点ID" },
    { "op": "delete_leaf", "node_id": "节点ID" },
    { "op": "noop" }
  ]
}

约束：
- 只输出必要的操作，不要包含多余的操作
- 如果没有变化，使用 {"op": "noop"}
- node_id、parent_id 必须与现有节点ID完全匹配（见上方节点ID映射）
- 不要覆盖用户编辑过的节点（editedByUser 为 true 的节点）
- update 操作只包含需要修改的字段
- delete_leaf 只能用于叶子节点（没有子节点的节点）
- merge 操作将 from_id 的子节点合并到 to_id，然后删除 from_id`

  return { systemPrompt, userMessage }
}

function flattenTree(nodes: MindMapNode[]): MindMapNode[] {
  const result: MindMapNode[] = []
  for (const node of nodes) {
    result.push(node)
    result.push(...flattenTree(node.children))
  }
  return result
}

export function parseOperations(jsonString: string): IncrementalOperation[] | null {
  try {
    const parsed = JSON.parse(jsonString) as { analysis?: string; operations?: unknown[] }
    if (!Array.isArray(parsed.operations)) return null

    const ops: IncrementalOperation[] = []
    for (const item of parsed.operations) {
      if (!item || typeof item !== 'object') return null
      const op = item as Record<string, unknown>

      switch (op.op) {
        case 'add_child': {
          if (typeof op.parent_id !== 'string') return null
          if (!op.node || typeof op.node !== 'object') return null
          const node = op.node as Record<string, unknown>
          if (typeof node.label !== 'string') return null
          ops.push({
            op: 'add_child',
            parent_id: op.parent_id,
            node: {
              label: node.label,
              summary: typeof node.summary === 'string' ? node.summary : '',
            },
          })
          break
        }
        case 'update': {
          if (typeof op.node_id !== 'string') return null
          if (!op.changes || typeof op.changes !== 'object') return null
          const changes = op.changes as Record<string, unknown>
          if (typeof changes.label !== 'string' && typeof changes.summary !== 'string') return null
          const cleanChanges: { label?: string; summary?: string } = {}
          if (typeof changes.label === 'string') cleanChanges.label = changes.label
          if (typeof changes.summary === 'string') cleanChanges.summary = changes.summary
          ops.push({ op: 'update', node_id: op.node_id, changes: cleanChanges })
          break
        }
        case 'merge': {
          if (typeof op.from_id !== 'string') return null
          if (typeof op.to_id !== 'string') return null
          ops.push({ op: 'merge', from_id: op.from_id, to_id: op.to_id })
          break
        }
        case 'delete_leaf': {
          if (typeof op.node_id !== 'string') return null
          ops.push({ op: 'delete_leaf', node_id: op.node_id })
          break
        }
        case 'noop': {
          ops.push({ op: 'noop' })
          break
        }
        default:
          return null
      }
    }

    return ops
  } catch {
    return null
  }
}

function findNodeById(nodes: MindMapNode[], id: string): MindMapNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNodeById(node.children, id)
    if (found) return found
  }
  return null
}

function findParentAndNode(
  nodes: MindMapNode[],
  id: string,
  parent: MindMapNode | null = null,
): { parent: MindMapNode | null; node: MindMapNode | null } {
  for (const node of nodes) {
    if (node.id === id) return { parent, node }
    const found = findParentAndNode(node.children, id, node)
    if (found.node) return found
  }
  return { parent: null, node: null }
}

export function buildEditedNodeIdSet(tree: MindMapNode[]): Set<string> {
  const ids = new Set<string>()
  function walk(nodes: MindMapNode[]) {
    for (const node of nodes) {
      if (node.editedByUser) ids.add(node.id)
      walk(node.children)
    }
  }
  walk(tree)
  return ids
}

export function applyOperations(
  tree: MindMapNode[],
  ops: IncrementalOperation[],
  editedNodeIds: Set<string>,
): { newTree: MindMapNode[]; changes: ChangeRecord[] } {
  const newTree = structuredClone(tree)
  const changes: ChangeRecord[] = []
  const now = Date.now()

  for (const op of ops) {
    switch (op.op) {
      case 'add_child': {
        const parent = findNodeById(newTree, op.parent_id)
        if (!parent) continue
        const newNode: MindMapNode = {
          id: generateId(),
          label: op.node.label,
          summary: op.node.summary,
          children: [],
          sourceConversationIds: [],
          sourceExcerpts: {},
          editedByUser: false,
        }
        parent.children.push(newNode)
        changes.push({
          op: 'add_child',
          nodeId: newNode.id,
          description: `Added "${op.node.label}" under "${parent.label}"`,
          timestamp: now,
        })
        break
      }
      case 'update': {
        const node = findNodeById(newTree, op.node_id)
        if (!node) continue
        if (editedNodeIds.has(op.node_id)) continue
        if (op.changes.label !== undefined) node.label = op.changes.label
        if (op.changes.summary !== undefined) node.summary = op.changes.summary
        changes.push({
          op: 'update',
          nodeId: op.node_id,
          description: `Updated "${node.label}" (${Object.keys(op.changes).join(', ')})`,
          timestamp: now,
        })
        break
      }
      case 'merge': {
        const { parent: fromParent, node: fromNode } = findParentAndNode(newTree, op.from_id)
        const toNode = findNodeById(newTree, op.to_id)
        if (!fromNode || !toNode) continue
        toNode.children.push(...fromNode.children)
        fromNode.children = []
        if (fromParent) {
          fromParent.children = fromParent.children.filter(c => c.id !== op.from_id)
        } else {
          const idx = newTree.findIndex(n => n.id === op.from_id)
          if (idx !== -1) newTree.splice(idx, 1)
        }
        changes.push({
          op: 'merge',
          nodeId: op.from_id,
          description: `Merged "${fromNode.label}" into "${toNode.label}"`,
          timestamp: now,
        })
        break
      }
      case 'delete_leaf': {
        const { parent, node } = findParentAndNode(newTree, op.node_id)
        if (!node) continue
        if (node.children.length > 0) continue
        if (editedNodeIds.has(op.node_id)) continue
        if (parent) {
          parent.children = parent.children.filter(c => c.id !== op.node_id)
        } else {
          const idx = newTree.findIndex(n => n.id === op.node_id)
          if (idx !== -1) newTree.splice(idx, 1)
        }
        changes.push({
          op: 'delete_leaf',
          nodeId: op.node_id,
          description: `Deleted leaf "${node.label}"`,
          timestamp: now,
        })
        break
      }
      case 'noop':
        break
    }
  }

  return { newTree, changes }
}

export async function* generateMindmap(
  client: OpenAI,
  mindmap: MindMap,
  corpus: CorpusEntry[],
  conversations: Conversation[],
  modelId: string,
  signal?: AbortSignal,
  mode: 'full' | 'incremental' = 'full'
): AsyncIterable<string> {
  const effectiveDepth = mindmap.maxDepth == null ? 3 : mindmap.maxDepth === 0 ? 6 : mindmap.maxDepth
  const existingTree = mindmap.tree.length > 0 ? mindmap.tree : null
  const { content: materialContent, sourceMap } = collectCorpusContent(corpus, conversations)

  yield { sourceMap } as unknown as string

  let systemPrompt: string
  let userMessage: string

  if (mode === 'incremental' && existingTree) {
    const result = buildIncrementalPrompt(existingTree, conversations, materialContent)
    systemPrompt = result.systemPrompt
    userMessage = result.userMessage
  } else {
    const result = buildMindmapPrompt(existingTree, conversations, materialContent, true, effectiveDepth)
    systemPrompt = result.systemPrompt
    userMessage = result.userMessage
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ]

  const createParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
    model: modelId,
    messages,
    stream: false,
  }

  createParams.response_format = { type: 'json_object' } as OpenAI.Chat.Completions.ChatCompletionCreateParams['response_format']

  let response: OpenAI.Chat.Completions.ChatCompletion
  try {
    response = await client.chat.completions.create(createParams, { signal })
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('response_format')) {
      delete createParams.response_format
      response = await client.chat.completions.create(createParams, { signal })
    } else {
      throw err
    }
  }

  const fullText = response.choices[0]?.message?.content ?? ''

  if (mode === 'incremental' && existingTree) {
    yield fullText
    const parsed = parseOperations(fullText)
    yield { incrementalResult: parsed } as unknown as string
  } else {
    yield fullText
  }
}


