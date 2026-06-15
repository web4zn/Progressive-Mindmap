/// <reference lib="WebWorker" />
import { tool } from 'ai'
import { z } from 'zod'
import type { WorkerToMainMessage, MainToWorkerResponse } from '../lib/agent/types'

// ─── Round-trip: Worker 请求主线程执行工具 ───
export function callMain(toolName: string, args: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const callId = crypto.randomUUID()
    console.log('[🧠 Worker]', `→ 请求主线程执行工具: ${toolName}`, { args, callId })

    const handler = (event: MessageEvent<MainToWorkerResponse>) => {
      const msg = event.data
      if (msg.type === 'TOOL_RESULT' && msg.payload.callId === callId) {
        self.removeEventListener('message', handler)
        console.log('[🧠 Worker]', `← 工具 ${toolName} 结果已返回`)
        resolve(msg.payload.result)
      }
      if (msg.type === 'TOOL_ERROR' && msg.payload.callId === callId) {
        self.removeEventListener('message', handler)
        console.error('[🧠 Worker]', `← 工具 ${toolName} 返回错误:`, msg.payload.error)
        reject(new Error(msg.payload.error))
      }
    }
    self.addEventListener('message', handler)

    const postMsg: WorkerToMainMessage = {
      type: 'TOOL_RESULT_NEEDED',
      payload: { callId, toolName, args },
    }
    self.postMessage(postMsg)
  })
}

// ─── 报告状态 ───
export function reportStatus(
  status: 'idle' | 'thinking' | 'reading_mindmap' | 'reading_node' | 'generating_mindmap' | 'complete' | 'error',
  message?: string,
) {
  const postMsg: WorkerToMainMessage = {
    type: 'AGENT_STATUS',
    payload: { status: status as never, message },
  }
  self.postMessage(postMsg)
}

// ─── 工具定义（使用 AI SDK 原生 tool，含 inputSchema） ───
export const agentTools = {
  generateMindmapOps: tool({
    description:
      '应用脑图增量更新操作。当前脑图结构已在上下文中提供，直接利用其中的节点 ID 决定操作后调用本工具提交。每个节点都必须包含 content（HTML富文本）和 contentType（设为"html"）字段，不得省略。',
    inputSchema: z.object({
      operations: z.array(
        z.object({
          type: z
            .enum(['add_child', 'update', 'delete_leaf', 'add_root', 'reparent'])
            .describe('操作类型'),
          parentId: z.string().optional().describe('add_child 时，目标父节点 ID。不填默认第一个根节点'),
          nodeId: z.string().optional().describe('update/delete_leaf/reparent 的目标节点 ID'),
          newParentId: z.string().optional().describe('reparent 时，新的目标父节点 ID'),
          id: z.string().optional().describe(
            'add_child/add_root 时可选，为新节点指定 ID。指定后可在同批次后续操作中用 parentId 引用',
          ),
          label: z.string().optional().describe('add_child/add_root 时必填，节点标题'),
          summary: z.string().optional().describe('节点摘要'),
          content: z.string().optional().describe('节点详细内容，建议使用 HTML 格式增强展示。add_child/add_root 时不应省略。'),
          contentType: z
            .enum(['text', 'html'])
            .optional()
            .describe('内容类型，新建节点时请设为 "html"。'),
        }),
      ),
    }),
    execute: async ({ operations }) => {
      reportStatus('generating_mindmap', `应用 ${operations.length} 个操作...`)
      return callMain('generateMindmapOps', { operations }) as Promise<Record<string, unknown>>
    },
  }),

  // ─── 节点级查询工具 ───
  getNodeDetail: tool({
    description:
      '获取单个节点的完整信息，包括标题、摘要、详细内容（HTML富文本）、子节点数量、是否被用户编辑过。用于深入了解某个特定节点的全部内容。',
    inputSchema: z.object({
      nodeId: z.string().describe('目标节点的 ID'),
    }),
    execute: async ({ nodeId }) => {
      reportStatus('reading_node', `读取节点详情: ${nodeId}`)
      return callMain('getNodeDetail', { nodeId }) as Promise<Record<string, unknown>>
    },
  }),
  getChildren: tool({
    description:
      '获取某个节点的所有直接子节点列表（仅含 ID、标题和摘要，不含详细 HTML 内容）。用于了解某个主题下的子话题结构，避免一次拉取过多内容。',
    inputSchema: z.object({
      nodeId: z.string().describe('目标父节点的 ID'),
    }),
    execute: async ({ nodeId }) => {
      reportStatus('reading_node', `读取子节点: ${nodeId}`)
      return callMain('getChildren', { nodeId }) as Promise<Record<string, unknown>>
    },
  }),
  getParent: tool({
    description:
      '获取某个节点的父节点。返回父节点的 ID 和标题。根节点无父节点时 parent 为 null。需要看同级节点请用 getSiblings 工具。',
    inputSchema: z.object({
      nodeId: z.string().describe('目标节点的 ID'),
    }),
    execute: async ({ nodeId }) => {
      reportStatus('reading_node', `读取父节点: ${nodeId}`)
      return callMain('getParent', { nodeId }) as Promise<Record<string, unknown>>
    },
  }),
  getSiblings: tool({
    description:
      '获取某个节点的所有同级节点（同父的其他子节点）。返回父节点信息和排除自身后的同级节点列表。根节点返回其他根节点作为 siblings。',
    inputSchema: z.object({
      nodeId: z.string().describe('目标节点的 ID'),
    }),
    execute: async ({ nodeId }) => {
      reportStatus('reading_node', `读取兄弟节点: ${nodeId}`)
      return callMain('getSiblings', { nodeId }) as Promise<Record<string, unknown>>
    },
  }),
  getAncestors: tool({
    description:
      '获取从根节点到当前节点的完整路径（breadcrumb），每层包含 ID、标题和深度。用于理解当前节点在整个脑图中的层级脉络。',
    inputSchema: z.object({
      nodeId: z.string().describe('目标节点的 ID'),
    }),
    execute: async ({ nodeId }) => {
      reportStatus('reading_node', `读取路径: ${nodeId}`)
      return callMain('getAncestors', { nodeId }) as Promise<Record<string, unknown>>
    },
  }),
  getSubtree: tool({
    description:
      '获取以某个节点为根的子树。可通过 depth 参数限制深度（1=仅当前节点, 2=当前+子节点, 默认 2, 最大 5）。用于了解某个分支的整体结构，不需要拉取整棵脑图。',
    inputSchema: z.object({
      nodeId: z.string().describe('目标子树的根节点 ID'),
      depth: z.number().min(1).max(5).optional().describe('子树深度，默认 2'),
    }),
    execute: async ({ nodeId, depth }) => {
      reportStatus('reading_node', `读取子树: ${nodeId}`)
      return callMain('getSubtree', { nodeId, depth }) as Promise<Record<string, unknown>>
    },
  }),
  searchNodes: tool({
    description:
      '按关键词搜索脑图中所有节点的标题和摘要。返回匹配节点的 ID、标题、摘要和路径。用于在脑图中查找与当前话题相关的其他节点，关联分散在不同分支的概念。',
    inputSchema: z.object({
      query: z.string().describe('搜索关键词，大小写不敏感，匹配节点的标题和摘要'),
    }),
    execute: async ({ query }) => {
      reportStatus('reading_node', `搜索节点: ${query}`)
      return callMain('searchNodes', { query }) as Promise<Record<string, unknown>>
    },
  }),
}
