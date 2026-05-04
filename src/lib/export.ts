import type { Conversation } from '@/types/conversation'
import type { MindMap, MindMapNode } from '@/types/mindmap'

export function exportConversationAsMarkdown(conversation: Conversation): string {
  const lines: string[] = []
  lines.push(`# ${conversation.title}`)
  lines.push('')
  lines.push(`> 导出时间: ${new Date().toLocaleString('zh-CN')}`)
  lines.push(`> 模型: ${conversation.modelId}`)
  if (conversation.systemPrompt) {
    lines.push(`> 系统提示词: ${conversation.systemPrompt}`)
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const msg of conversation.messages) {
    const role = msg.role === 'user' ? '👤 用户' : '🤖 AI'
    const time = new Date(msg.createdAt).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    lines.push(`### ${role} (${time})`)
    lines.push('')
    lines.push(msg.content)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.md') ? filename : `${filename}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function nodesToMarkdown(nodes: MindMapNode[], depth: number): string {
  const lines: string[] = []
  const prefix = '#'.repeat(Math.min(depth + 1, 6))

  for (const node of nodes) {
    let line = `${prefix} ${node.label}`
    if (node.summary) {
      line += ` —— ${node.summary}`
    }
    lines.push(line)
    if (node.children.length > 0 && depth < 5) {
      lines.push(nodesToMarkdown(node.children, depth + 1))
    }
  }

  return lines.join('\n')
}

export function exportMindmapAsMarkdown(mindmap: MindMap): string {
  const lines: string[] = []
  lines.push(`# ${mindmap.title}`)
  lines.push('')
  lines.push(`> 导出时间: ${new Date().toLocaleString('zh-CN')}`)
  lines.push(`> 节点数: ${countNodes(mindmap.tree)}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  if (mindmap.tree.length > 0) {
    lines.push(nodesToMarkdown(mindmap.tree, 0))
  } else {
    lines.push('（空白图谱）')
  }

  return lines.join('\n')
}

function countNodes(nodes: MindMapNode[]): number {
  let count = nodes.length
  for (const node of nodes) {
    count += countNodes(node.children)
  }
  return count
}
