// ========================================
// Worker 通信协议类型定义
// ========================================

// ─── 增量操作类型 ───
export type MindmapOperation =
  | { type: 'add_child'; parentId?: string; id?: string; label: string; summary?: string; content?: string; contentType?: 'text' | 'html' }
  | { type: 'update'; nodeId: string; patch: Partial<{ label: string; summary: string; content: string; contentType: 'text' | 'html' }> }
  | { type: 'delete_leaf'; nodeId: string }
  | { type: 'add_root'; id?: string; label: string; summary?: string; content?: string; contentType?: 'text' | 'html' }
  | { type: 'noop' }

// ─── Agent 状态 ───
export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'reading_mindmap'
  | 'generating_mindmap'
  | 'complete'
  | 'error'

// ========================================
// 主线程 → Worker 消息
// ========================================
export type MainToWorkerMessage =
  | {
      type: 'INIT'
      payload: {
        providerConfig: { apiEndpoint: string; apiKey: string }
        model: string
        mindmapSystemPrompt: string
      }
    }
  | {
      type: 'ENHANCE_MESSAGE'
      payload: {
        conversationId: string
        recentMessages: { role: string; content: string }[]
        mindmapTreeJson: string
        pattern: string
        providerConfig: { apiEndpoint: string; apiKey: string }
        model: string
      }
    }
  | {
      type: 'MEDIATE_MESSAGE'
      payload: {
        conversationId: string
        content: string
        recentMessages: { role: string; content: string }[]
        mindmapTreeJson: string
        providerConfig: { apiEndpoint: string; apiKey: string }
        model: string
      }
    }

// ========================================
// Worker → 主线程消息
// ========================================
export type WorkerToMainMessage =
  | {
      type: 'AGENT_STATUS'
      payload: {
        status: AgentStatus
        message?: string
      }
    }
  | {
      type: 'TOOL_RESULT_NEEDED'
      payload: {
        callId: string
        toolName: string
        args: unknown
      }
    }
  | {
      type: 'AGENT_COMPLETE'
      payload: {
        operations: MindmapOperation[]
        newTreeJson: string
      }
    }
  | {
      type: 'AGENT_ERROR'
      payload: { error: string }
    }
  | {
      type: 'STREAM_TOKEN'
      payload: { token: string }
    }
  | {
      type: 'STREAM_DONE'
      payload: { mindmapUpdated: boolean }
    }

// ========================================
// 主线程 → Worker 响应（工具结果）
// ========================================
export type MainToWorkerResponse =
  | {
      type: 'TOOL_RESULT'
      payload: {
        callId: string
        result: unknown
      }
    }
  | {
      type: 'TOOL_ERROR'
      payload: {
        callId: string
        error: string
      }
    }
