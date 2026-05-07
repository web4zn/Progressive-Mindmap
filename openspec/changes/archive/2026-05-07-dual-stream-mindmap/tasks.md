## 1. Core Types & Removals

- [x] 1.1 Remove CorpusEntry, IncrementalOperation, and obsolete types from src/types/mindmap.ts
- [x] 1.2 Remove KnowledgeNode type (superseded by full tree output)
- [x] 1.3 Delete src/lib/knowledge-applier.ts (superseded by LLM full-tree output)
- [x] 1.4 Simplify MindMap type: remove corpus, generatorProviderId, generatorModelId, forceFullRebuild, lastGeneratedAt, maxDepth

## 2. Full Mindmap Prompt

- [x] 2.1 Add buildFullMindmapPrompt(useJsonMode) — dual-mode prompt (JSON vs marker-based)
- [x] 2.2 JSON mode prompt: LLM outputs {"answer": "...", "mindmap": {"nodes": [...]}}
- [x] 2.3 Fallback mode prompt: LLM outputs <!--MINDMAP-->...<!--/MINDMAP--> delimiters
- [x] 2.4 Preserve editedByUser nodes via findEditedNodes / mergeEditedNodes
- [x] 2.5 Remove node count, depth, and breadth limits from prompt

## 3. JSON Mode (response_format)

- [x] 3.1 Add useJsonMode param to chat() in src/lib/llm-client.ts
- [x] 3.2 Set response_format: { type: "json_object" } when provider supports it
- [x] 3.3 Parse {"answer": "...", "mindmap": {"nodes": [...]}} in ChatPage.tsx
- [x] 3.4 Fallback to <!--MINDMAP--> marker parsing when JSON mode unavailable
- [x] 3.5 Add trailing comma repair in parseJsonToTree() for robustness

## 4. Stream Handler (Non-Streaming for Debugging)

- [x] 4.1 Switch from streamChatWithRetry to chat() (non-streaming) for reliable JSON parsing
- [x] 4.2 Detect <!--MINDMAP--> markers in fallback mode
- [x] 4.3 Strip knowledge content from displayed chat text
- [x] 4.4 Apply parsed tree to mindmap store with editedByUser preservation
- [x] 4.5 Handle abort: discard partial response

## 5. Mindmap-as-Context

- [x] 5.1 Implement mindmapTreeToContext() — serialize tree as Markdown headings
- [x] 5.2 Mark editedByUser nodes with [用户编辑] in context
- [x] 5.3 Combine system prompt + mindmap context into single system message
- [x] 5.4 Include last raw messages for wording nuance

## 6. Remove Legacy Features

- [x] 6.1 Remove 5s debounce timer logic from ChatPage.tsx
- [x] 6.2 Remove auto-triggered generateMindmap() call
- [x] 6.3 Remove corpus UI from MindMapPanel.tsx
- [x] 6.4 Remove "更新图谱" button and handleGenerate()
- [x] 6.5 Remove "加入语料库" button from MessageBubble.tsx
- [x] 6.6 Remove generator model settings (generatorProviderId/ModelId)
- [x] 6.7 Remove maxDepth selector and forceFullRebuild checkbox

## 7. Mindmap Association UX

- [x] 7.1 NewConversationDialog: support "不关联 / 已有图谱 / 创建新图谱" radio buttons
- [x] 7.2 ChatPage: link conversation to mindmap via addMonitoredConversation on creation
- [x] 7.3 MindMapPanel: show linked conversations list with add/remove
- [x] 7.4 Fix Base UI SelectValue showing ID instead of title

## 8. Layout & Polish

- [x] 8.1 Increase dagre spacing: nodesep 100, ranksep 180, edgesep 30, marginx/y 80
- [x] 8.2 Update MindMapTree empty state text
- [x] 8.3 Remove debug console.log statements (left for development)

## 9. Testing

- [x] 9.1 Rewrite mindmap-generator.test.ts for new functions
- [x] 9.2 Remove corpus operation tests from mindmapStore.test.ts
- [x] 9.3 TypeScript strict check clean (npx tsc --noEmit)
- [x] 9.4 All 73 tests passing
- [x] 9.5 ESLint clean
