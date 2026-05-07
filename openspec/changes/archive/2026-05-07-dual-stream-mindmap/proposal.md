## Why

Current mindmap generation is a two-phase batch process: chat completes -> user triggers -> separate LLM call generates mindmap. Dual-stream output eliminates the separate generation step: every chat response carries a full updated mindmap in the same API call, with zero extra latency. Using JSON mode (response_format: "json_object") ensures the mindmap JSON is always valid. The accumulated mindmap tree replaces raw conversation history as LLM context, reducing prompt tokens by 60-80%.

## What Changes

- **Single-call mindmap output**: Chat response includes both answer text and full updated mindmap JSON in one API call
- **JSON mode**: Providers supporting response_format: "json_object" output {"answer": "...", "mindmap": {"nodes": [...]}} - guaranteed valid JSON
- **Fallback marker mode**: For providers without JSON mode, <!--MINDMAP--> delimiters separate answer from mindmap
- **Mindmap-as-context**: The existing mindmap tree (not raw history) is fed to the LLM as context, with last recent messages retained
- **Simplified data model**: Corpus, batch generation, knowledge-applier, and all intermediate types removed
- **Edited node preservation**: findEditedNodes/mergeEditedNodes preserve user-edited nodes across regenerations
- Auto-triggered generation (5s debounce) and corpus curation are **removed**

## Capabilities

### New Capabilities

- `full-mindmap-output`: Single API call produces both chat answer and complete updated mindmap tree
- `mindmap-as-context`: Using accumulated mindmap tree as LLM context instead of raw conversation history

### Modified Capabilities

- `chat-interface`: Response is now non-streaming single call; JSON mode with answer/mindmap fields; fallback marker parsing
- `mindmap-generation`: Full tree output replaces batch generation; editedByUser nodes preserved via findEditedNodes/mergeEditedNodes
- `mindmap-corpus`: **REMOVED** - corpus and all related UI/data are deleted
- `conversation-management`: Hybrid context construction (mindmap tree + last messages) replaces full history

## Impact

- src/features/chat/ChatPage.tsx: JSON mode + marker mode response processing; mindmap-as-context; association dialog
- src/lib/llm-client.ts: chat() with useJsonMode parameter
- src/lib/mindmap-generator.ts: buildFullMindmapPrompt() dual-mode; parseJsonToTree with comma repair; mindmapTreeToContext; findEditedNodes/mergeEditedNodes
- src/features/mindmap/MindMapPanel.tsx: Simplified - remove corpus/generate/settings; add linked conversation list
- src/stores/mindmapStore.ts: Remove corpus actions; simplify MindMap type
- src/types/mindmap.ts: Remove CorpusEntry, KnowledgeNode, IncrementalOperation, etc.
