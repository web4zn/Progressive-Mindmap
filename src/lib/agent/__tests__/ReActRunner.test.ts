// @vitest-environment node
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { tool } from 'ai'
import { z } from 'zod'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildAssistantMessage, buildToolMessage, ReActRunner } from '../ReActRunner'

/**
 * Regression guard for the "thinking mode + tools" contract.
 *
 * DeepSeek (api-docs.deepseek.com/guides/thinking_mode) requires that, whenever a
 * request carries `tools`, `reasoning_content` is passed back for **every**
 * earlier assistant turn — even the ones that performed no tool call. A missing
 * `reasoning_content` makes the API answer 400:
 *
 *   The `reasoning_content` in the thinking mode must be passed back to the API.
 *
 * The mock endpoint below enforces exactly that rule, so the old implementation
 * (which dropped reasoning and fabricated assistant text messages in place of
 * tool turns) fails this test.
 */

interface ChatMessage {
  role: string
  content?: unknown
  reasoning_content?: string
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>
  tool_call_id?: string
}

interface CapturedRequest {
  messages: ChatMessage[]
  tools?: unknown[]
}

const ASSISTANT_TEXT = '完成：图表已更新'
const FIRST_TURN_REASONING = '先读取节点，再决定是否新增子节点。'
const SECOND_TURN_REASONING = '工具已经返回，无需再改。'
const TOOL_CALL_ID = 'call_rag_1'

function createMockServer(strictThinking: boolean) {
  const captured: CapturedRequest[] = []
  let callCount = 0

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      const body = JSON.parse(raw) as CapturedRequest
      captured.push(body)
      callCount++

      const writeJson = (status: number, payload: unknown) => {
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(payload))
      }

      // DeepSeek's rule: a `tools` request must echo every assistant turn's
      // reasoning, otherwise 400.
      if (strictThinking && body.tools) {
        const offending = body.messages.filter(
          (message) =>
            message.role === 'assistant' &&
            (!message.reasoning_content || message.reasoning_content.length === 0),
        )
        if (offending.length > 0) {
          writeJson(400, {
            error: {
              message:
                'The `reasoning_content` in the thinking mode must be passed back to the API.',
              type: 'invalid_request_error',
            },
          })
          return
        }
      }

      const base = { id: `chatcmpl-${callCount}`, object: 'chat.completion', created: 0 }
      const usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }

      if (callCount === 1) {
        writeJson(200, {
          ...base,
          model: 'deepseek-flash',
          choices: [
            {
              index: 0,
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                content: null,
                ...(strictThinking ? { reasoning_content: FIRST_TURN_REASONING } : {}),
                tool_calls: [
                  {
                    id: TOOL_CALL_ID,
                    type: 'function',
                    function: { name: 'noop_tool', arguments: JSON.stringify({ x: 1 }) },
                  },
                ],
              },
            },
          ],
          usage,
        })
        return
      }

      writeJson(200, {
        ...base,
        model: 'deepseek-flash',
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: ASSISTANT_TEXT,
              ...(strictThinking ? { reasoning_content: SECOND_TURN_REASONING } : {}),
            },
          },
        ],
        usage,
      })
    })
  })

  return { server, captured }
}

const noopTool = tool({
  description: '不做任何事，仅用于测试工具往返',
  inputSchema: z.object({ x: z.number() }),
  execute: async ({ x }) => ({ ok: true, x }),
})

function buildRunner(baseURL: string, modelId: string) {
  const provider = createOpenAICompatible({
    name: 'test-provider',
    baseURL,
    apiKey: 'test-key',
  })
  return new ReActRunner({
    model: provider.chatModel(modelId),
    systemPrompt: '你是测试 Agent。',
    tools: { noop_tool: noopTool },
    onStatusReport: () => {},
    maxSteps: 4,
  })
}

describe.each([
  { strictThinking: true, modelId: 'deepseek-flash' },
  { strictThinking: false, modelId: 'gpt-4o-mini' },
])('ReActRunner tool round ($modelId)', ({ strictThinking, modelId }) => {
  let server: Server
  let baseURL = ''
  let captured: CapturedRequest[] = []

  beforeAll(async () => {
    const mock = createMockServer(strictThinking)
    server = mock.server
    captured = mock.captured
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo
    baseURL = `http://127.0.0.1:${port}/v1`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('completes the loop and threads structured tool turns', async () => {
    const runner = buildRunner(baseURL, modelId)
    const answer = await runner.run('把对话整理成脑图')

    expect(answer).toBe(ASSISTANT_TEXT)
    expect(captured).toHaveLength(2)

    const secondRequest = captured[1]
    expect(secondRequest).toBeDefined()
    expect(secondRequest?.tools?.length).toBeGreaterThan(0)

    // The assistant tool turn must carry the tool calls themselves …
    const assistantTurns = (secondRequest?.messages ?? []).filter(
      (message) => message.role === 'assistant',
    )
    expect(assistantTurns).toHaveLength(1)
    expect(assistantTurns[0]?.tool_calls?.[0]?.id).toBe(TOOL_CALL_ID)

    // … and a matching `tool` turn instead of a fabricated assistant message.
    const toolTurns = (secondRequest?.messages ?? []).filter(
      (message) => message.role === 'tool',
    )
    expect(toolTurns).toHaveLength(1)
    expect(toolTurns[0]?.tool_call_id).toBe(TOOL_CALL_ID)
    expect(String(toolTurns[0]?.content)).toContain('"ok":true')

    if (strictThinking) {
      // The whole point of the fix: reasoning is echoed back.
      expect(assistantTurns[0]?.reasoning_content).toBe(FIRST_TURN_REASONING)
    } else {
      // Non-thinking providers must not receive a made-up reasoning field.
      expect(assistantTurns[0]?.reasoning_content).toBeUndefined()
    }
  })
})

describe('message builders', () => {
  const call = { toolCallId: 'call_a', toolName: 'some_tool', input: { x: 1 } }

  it('omits the reasoning part when the model produced none', () => {
    const message = buildAssistantMessage({ text: 'hi', reasoning: '', toolCalls: [call] })
    expect(message.role).toBe('assistant')
    const parts = message.content as Array<{ type: string }>
    expect(parts.map((part) => part.type)).toEqual(['text', 'tool-call'])
  })

  it('puts reasoning before text and tool calls', () => {
    const message = buildAssistantMessage({
      text: 'hi',
      reasoning: '先想一想',
      toolCalls: [call],
    })
    const parts = message.content as Array<{ type: string }>
    expect(parts.map((part) => part.type)).toEqual(['reasoning', 'text', 'tool-call'])
  })

  it('answers unexecuted tool calls with error results so pairing stays valid', () => {
    const message = buildToolMessage([call], [], '参数解析失败')
    expect(message.role).toBe('tool')
    const parts = message.content as Array<{
      type: string
      toolCallId: string
      output: { type: string; value: string }
    }>
    expect(parts).toHaveLength(1)
    expect(parts[0]?.toolCallId).toBe('call_a')
    expect(parts[0]?.output.type).toBe('error-text')
    expect(parts[0]?.output.value).toBe('参数解析失败')
  })

  it('answers a tool call whose execution failed, keeping one result per call', () => {
    const message = buildToolMessage(
      [call, { toolCallId: 'call_b', toolName: 'other_tool', input: {} }],
      [{ toolCallId: 'call_a', toolName: 'some_tool', output: { ok: true } }],
      '工具执行失败',
    )
    const parts = message.content as Array<{
      toolCallId: string
      output: { type: string; value?: string }
    }>
    expect(parts).toHaveLength(2)
    expect(parts[0]?.output.type).toBe('json')
    expect(parts[1]?.toolCallId).toBe('call_b')
    expect(parts[1]?.output.type).toBe('error-text')
    expect(parts[1]?.output.value).toBe('工具执行失败')
  })

  it('normalizes tool outputs to text for strings and json for objects', () => {
    const message = buildToolMessage(
      [call, { toolCallId: 'call_b', toolName: 'some_tool', input: {} }],
      [
        { toolCallId: 'call_a', toolName: 'some_tool', output: 'plain' },
        { toolCallId: 'call_b', toolName: 'some_tool', output: { ok: true } },
      ],
      'ignored',
    )
    const parts = message.content as Array<{ output: { type: string } }>
    expect(parts[0]?.output.type).toBe('text')
    expect(parts[1]?.output.type).toBe('json')
  })
})
