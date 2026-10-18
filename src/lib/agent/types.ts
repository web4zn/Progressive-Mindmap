// ========================================
// Worker 通信协议类型定义
// ========================================

// ─── 增量操作类型 ───
export type MindmapOperation =
  | { type: 'add_child'; parentId?: string; id?: string; label: string; summary?: string; content?: string; contentType?: 'text' | 'html' }
  | { type: 'update'; nodeId: string; label?: string; summary?: string; content?: string; contentType?: 'text' | 'html' }
  | { type: 'delete_leaf'; nodeId: string }
  | { type: 'add_root'; id?: string; label: string; summary?: string; content?: string; contentType?: 'text' | 'html' }
  | { type: 'reparent'; nodeId: string; newParentId: string }
  | { type: 'noop' }

// ─── Agent 状态 ───
export type AgentStatus =
  | 'idle'
  | 'thinking'
  | 'reading_mindmap'
  | 'reading_node'
  | 'generating_mindmap'
  | 'complete'
  | 'error'

/**
 * Immutable per-run execution context captured by the main thread when a
 * run starts. Tool handlers resolve their target mindmap and scope from
 * this context — never from the "currently active" conversation.
 */
export interface AgentToolContext {
  conversationId: string
  mindmapId: string
  /** When set, the run may only read/apply within this node's subtree. */
  scopeNodeId: string | null
}

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
        runId: string
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
        runId: string
        conversationId: string
        content: string
        recentMessages: { role: string; content: string }[]
        mindmapTreeJson: string
        providerConfig: { apiEndpoint: string; apiKey: string }
        model: string
      }
    }
  | {
      /** Cancel the active run, or a specific run when `runId` is given. */
      type: 'CANCEL_RUN'
      payload: { runId?: string }
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
        runId?: string
      }
    }
  | {
      type: 'TOOL_RESULT_NEEDED'
      payload: {
        callId: string
        toolName: string
        args: unknown
        runId: string
      }
    }
  | {
      type: 'AGENT_COMPLETE'
      payload: {
        runId: string
        operations: MindmapOperation[]
        newTreeJson: string
      }
    }
  | {
      type: 'AGENT_ERROR'
      payload: { runId: string; error: string }
    }
  | {
      type: 'AGENT_CANCELLED'
      payload: { runId: string }
    }
  | {
      type: 'STREAM_TOKEN'
      payload: { runId: string; token: string }
    }
  | {
      type: 'STREAM_DONE'
      payload: { runId: string; mindmapUpdated: boolean }
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
