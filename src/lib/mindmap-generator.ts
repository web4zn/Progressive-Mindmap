import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { MindMapNode } from '../types/mindmap'
import { deriveNodeId } from './id'

export { deriveNodeId }

// ─── Mindmap Output Prompt ──────────────────────────────────────────

export function buildFullMindmapPrompt(useJsonMode = false): string {
  if (useJsonMode) {
    return `## 思维导图生成指令

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
  }

  return `## 思维导图生成指令

你的回答由两部分组成：
1. 正常回答用户问题（Markdown 格式）
2. 在回答的最末尾，输出更新后的完整思维导图 JSON

你必须按以下格式输出，不要省略标记，不要用代码块包裹：

<!--MINDMAP-->
{"nodes": [{"label": "主概念", "summary": "摘要", "children": [{"label": "子概念", "summary": "...", "children": []}]}]}
<!--/MINDMAP-->

规则：
- nodes 数组通常只包含一个根节点，所有内容都在它的 children 下面
- 已有思维导图结构会提供给你——你必须在它的基础上做三件事：
  1. 把本次对话新讨论的具体概念，作为子节点加入到已有树的对应位置
  2. 如果已有概念的分支不够详细，用新学到的知识细化它（增加子节点层级）
  3. 已有概念的摘要如果被新知识补充了，更新它
- 不要只是维持树的现有粗细粒度——对话中学到的新要点必须体现在树中
- 标记 [用户编辑] 的节点保持原样不要改动`
}

// ─── Markdown → Tree Parsing ──────────────────────────────────────

function stripSourceAnnotations(text: string): string {
  return text.replace(/\s*\[源:\s*[^\]]+\]\s*/g, '').trim()
}

export function parseMarkdownToTree(
  markdown: string,
  maxDepth = 6,
): MindMapNode[] {
  const lines = markdown.split('\n')
  const roots: MindMapNode[] = []
  const stack: { depth: number; node: MindMapNode }[] = []
  const headerRe = new RegExp('^(#{1,' + maxDepth + '})\\s+(.+)')

  for (const line of lines) {
    const headerMatch = line.match(headerRe)
    if (!headerMatch) continue

    const depth = headerMatch[1]?.length ?? 1
    const titleText = headerMatch[2]?.trim() ?? ''

    let label = titleText
    let summary = ''

    const sepIndex = titleText.indexOf('——')
    if (sepIndex !== -1) {
      label = titleText.slice(0, sepIndex).trim()
      summary = titleText.slice(sepIndex + 2).trim()
    }

    const parentPath = stack.map((s) => s.node.label)

    const node: MindMapNode = {
      id: deriveNodeId(label, parentPath),
      label: stripSourceAnnotations(label) || label,
      summary: stripSourceAnnotations(summary),
      children: [],
      sourceConversationIds: [],
      sourceExcerpts: {},
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
      if (parent) {
        parent.node.children.push(node)
      }
    }

    if (depth < maxDepth) {
      stack.push({ depth, node })
    }
  }

  return roots
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
  maxDepth = 6,
  parentLabels: string[] = [],
): MindMapNode {
  const raw = item as JsonNode
  const label = (raw.label ?? '未命名').trim()
  const cleanLabel = stripSourceAnnotations(label)
  const summary = (raw.summary ?? '').trim()
  const contentType =
    raw.contentType === 'markdown' || raw.contentType === 'text' ? raw.contentType : undefined
  const content = typeof raw.content === 'string' ? raw.content : undefined
  const children = (raw.children ?? [])
    .slice(0, 10)
    .map((c: JsonNode) =>
      jsonNodeToMindMapNode(c, depth + 1, maxDepth, [...parentLabels, cleanLabel || '未命名']),
    )

  return {
    id: deriveNodeId(label, parentLabels),
    label: cleanLabel || '未命名',
    summary: stripSourceAnnotations(summary),
    content,
    contentType,
    children: depth < (maxDepth ?? 6) ? children : [],
    sourceConversationIds: [],
    sourceExcerpts: {},
    editedByUser: false,
  }
}

export function parseJsonToTree(jsonString: string, maxDepth = 6): MindMapNode[] {
  const text = jsonString.trim()

  let parsed: { nodes?: unknown[] } = {}
  let parseStage = 0
  let parseError = ''
  try {
    parsed = JSON.parse(text) as { nodes?: unknown[] }
    parseStage = 1
  } catch (e1) {
    parseError = String(e1)
    // Try repairing trailing comma before } or ]
    let repaired = text.replace(/,(\s*[}\]])/g, '$1')
    const fenceStripped = repaired
      .replace(/^```(?:json)?\s*\n?/, '')
      .replace(/\n?\s*```\s*$/, '')
      .trim()
    try {
      parsed = JSON.parse(fenceStripped) as { nodes?: unknown[] }
      parseStage = 2
    } catch {
      const braceStart = text.indexOf('{')
      const braceEnd = text.lastIndexOf('}')
      if (braceStart !== -1 && braceEnd > braceStart) {
        const extracted = text.slice(braceStart, braceEnd + 1)
        // Also try repair on extracted
        const extractedRepaired = extracted.replace(/,(\s*[}\]])/g, '$1')
        try {
          parsed = JSON.parse(extractedRepaired) as { nodes?: unknown[] }
          parseStage = 3
        } catch {
          console.warn('[parseJsonToTree] all parse stages failed, error:', parseError, 'tail:', text.slice(-80), 'len:', text.length)
          return parseMarkdownToTree(jsonString, maxDepth)
        }
      } else {
        console.warn('[parseJsonToTree] no braces found, error:', parseError)
        return parseMarkdownToTree(jsonString, maxDepth)
      }
    }
  }

  if (!Array.isArray(parsed.nodes)) {
    console.warn('[parseJsonToTree] parsed.nodes is not an array, type:', typeof parsed.nodes)
    return parseMarkdownToTree(jsonString, maxDepth)
  }

  console.log('[parseJsonToTree] parse stage:', parseStage, 'nodes count:', parsed.nodes.length)
  return parsed.nodes.map((n) => jsonNodeToMindMapNode(n, 0, maxDepth))
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

export function buildHybridContext(
  messages: ChatCompletionMessageParam[],
  tree: MindMapNode[],
): ChatCompletionMessageParam[] {
  if (tree.length === 0) return messages

  const mindmapContext = mindmapTreeToContext(tree)
  if (!mindmapContext) return messages

  const result: ChatCompletionMessageParam[] = []
  result.push({ role: 'system', content: mindmapContext })
  result.push(...messages.slice(-4))

  return result
}
