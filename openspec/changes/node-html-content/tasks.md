## 1. HTML Rendering in FlowNode

- [x] 1.1 Install `dompurify` and `@types/dompurify`
- [x] 1.2 Replace `react-markdown` rendering with `dangerouslySetInnerHTML` + DOMPurify in `FlowNode.tsx`
- [x] 1.3 Configure DOMPurify tag/attribute whitelist
- [x] 1.4 Handle both old `markdown` and new `html` contentType for backward compat
- [x] 1.5 Write tests for XSS sanitization (script injection, event handlers)

## 2. Agent Layer — Support content field

- [x] 2.1 Extend `MindmapOperation` in `agent/types.ts` — add `content`/`contentType` to `add_child`/`add_root` and `update.patch`
- [x] 2.2 Update `newNodeFromOp` in `agent-tools.ts` to propagate `content`/`contentType`
- [x] 2.3 Update `applyOne` update branch to patch `content`/`contentType`
- [x] 2.4 Update Zod schemas in `schema.ts` to validate `content`/`contentType`
- [x] 2.5 Update AI SDK tool input schemas in `agent-tools.def.ts`

## 3. System Prompt Update

- [x] 3.1 Update `system-prompt.ts` — replace markdown content instructions with HTML instructions
- [x] 3.2 Include allowed tags list, prohibited constructs, and content length guidance
- [x] 3.3 Include example HTML content structure

## 4. Editor Update

- [x] 4.1 Update `MindMapEditModal.tsx` — switch from markdown editor to HTML editor
- [x] 4.2 Add live HTML preview in the editor
- [x] 4.3 Update `contentType` default and toggle options (text / html)

## 5. Type & Dependency Cleanup

- [x] 5.1 Change `contentType` type from `'text' | 'markdown'` to `'text' | 'html'` in all type definitions
- [x] 5.2 Remove `react-markdown` and `remark-gfm` dependencies — **kept** because `MessageBubble.tsx` still uses them for chat message rendering. Both deps remain.
- [x] 5.3 Run existing test suite — fix regressions (0 regressions, all 130 tests pass)

## 6. Testing

- [x] 6.1 Test Agent generates HTML content for new nodes
- [x] 6.2 Test XSS vectors are blocked by DOMPurify
- [x] 6.3 Test editor can edit and preview HTML content
- [x] 6.4 Test backward compat — old markdown nodes still display as text
