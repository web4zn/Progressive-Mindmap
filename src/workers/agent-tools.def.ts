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
  status: 'idle' | 'thinking' | 'reading_mindmap' | 'generating_mindmap' | 'complete' | 'error',
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
  readMindmap: tool({
    description:
      '读取当前脑图结构，返回每个节点的 ID、标签、摘要、content（HTML富文本）。用于了解现有结构后再决定操作。',
    inputSchema: z.object({}),
    execute: async () => {
      reportStatus('reading_mindmap', '正在读取脑图...')
      return callMain('readMindmap', {}) as Promise<Record<string, unknown>>
    },
  }),
  generateMindmapOps: tool({
    description:
      '应用脑图增量更新操作。先调用 readMindmap 获取节点 ID，然后根据对话内容决定操作，最后调用本工具提交操作。每个节点都必须包含 content（HTML富文本）和 contentType（设为"html"）字段，不得省略。',
    inputSchema: z.object({
      operations: z.array(
        z.object({
          type: z
            .enum(['add_child', 'update', 'delete_leaf', 'add_root'])
            .describe('操作类型'),
          parentId: z.string().optional().describe('add_child 时，目标父节点 ID。不填默认第一个根节点'),
          nodeId: z.string().optional().describe('update/delete_leaf 的目标节点 ID'),
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
          patch: z
            .object({
              label: z.string().optional(),
              summary: z.string().optional(),
              content: z.string().optional().describe('更新节点的 HTML 富文本内容'),
              contentType: z.enum(['text', 'html']).optional().describe('设为 "html"'),
            })
            .optional()
            .describe('update 时使用，要更新的字段。推荐同时更新 content 为 HTML 格式'),
        }),
      ),
    }),
    execute: async ({ operations }) => {
      reportStatus('generating_mindmap', `应用 ${operations.length} 个操作...`)
      return callMain('generateMindmapOps', { operations }) as Promise<Record<string, unknown>>
    },
  }),
}
