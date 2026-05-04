## 1. Minimap Core Component

- [x] 1.1 Create `src/components/Minimap.tsx` with component shell and props interface (`scrollRef`, `contentRef`, `width`, `className`)
- [x] 1.2 Implement `useEffect` that clones content DOM via `cloneNode(true)` and renders it inside a `transform: scale()` wrapper container
- [x] 1.3 Implement viewport overlay rendering: calculate overlay position (`top`) and height from `scrollTop / scrollHeight` and `clientHeight / scrollHeight` ratios, using `transform: translateY()` for performance
- [x] 1.4 Implement scroll event listener on `scrollRef` to update overlay position in real time, throttled via `requestAnimationFrame`
- [x] 1.5 Implement click-to-navigate: `onClick` handler on minimap that maps click Y position to `scrollRef.current.scrollTo({ top, behavior: 'instant' })`
- [x] 1.6 Implement drag-to-navigate: `onMouseDown` / `onMouseMove` / `onMouseUp` handlers on minimap that continuously update `scrollTop` during drag
- [x] 1.7 Add content change detection: `ResizeObserver` on content area to recalculate scale, `MutationObserver` on content area to re-clone DOM (debounced 200ms)
- [x] 1.8 Add visibility threshold: hide minimap when `scrollHeight <= clientHeight * 1.2`
- [x] 1.9 Add `md:flex hidden` responsive class so minimap only shows on md+ breakpoints
- [x] 1.10 Run `lsp_diagnostics` on `Minimap.tsx` and fix all errors/warnings

## 2. MindMapTree Integration

- [x] 2.1 Add `scrollRef` and `contentRef` (useRef) to `MindMapTree` component
- [x] 2.2 Restructure layout from `<div flex-1 overflow-y-auto>` to flex row: outer `<div flex flex-1>`, inner scroll `<div ref={scrollRef} flex-1 overflow-y-auto>`, content wrapper `<div ref={contentRef}>` around TreeNode list
- [x] 2.3 Import and render `<Minimap scrollRef={scrollRef} contentRef={contentRef} />` as sibling of scroll div
- [x] 2.4 Manually test: expand/collapse nodes and verify minimap updates, scroll tree and verify overlay sync, click/drag minimap to navigate
- [x] 2.5 Run `lsp_diagnostics` on `MindMapTree.tsx` and fix all errors/warnings

## 3. MessageList Integration

- [x] 3.1 Add `contentRef` (useRef) to `MessageList` component, wrapping the messages list inside scroll container
- [x] 3.2 Restructure layout: change outer wrapper from `<div className="absolute inset-0 ...">` to `<div className="flex ...">` with scroll area as `flex-1 overflow-y-auto h-full` and minimap as fixed-width sibling
- [x] 3.3 Import and render `<Minimap scrollRef={scrollRef} contentRef={contentRef} />` after the scroll container
- [x] 3.4 Ensure auto-scroll behavior is preserved: `bottomRef.scrollIntoView()` still works, `handleScroll` threshold detection unchanged, "scroll to bottom" button still appears/functions
- [x] 3.5 Handle auto-scroll pause during minimap drag: communicate drag state to `MessageList` so `autoScroll` is suppressed during drag and resumes 2s after drag ends
- [x] 3.6 Manually test: send messages and verify auto-scroll still works, stream a response and verify minimap updates in real time, click/drag minimap to navigate, verify auto-scroll pauses and resumes
- [x] 3.7 Run `lsp_diagnostics` on `MessageList.tsx` and fix all errors/warnings

## 4. Polish and Verification

- [x] 4.1 Verify minimap is hidden when content fits viewport (e.g., very short conversation or small tree)
- [x] 4.2 Verify minimap does not appear on mobile (< md breakpoint)
- [x] 4.3 Verify dark mode: overlay color adapts to theme via CSS variables
- [x] 4.4 Run full build (`npm run build`) and ensure zero new errors
- [x] 4.5 Run existing tests (`npm test`) and ensure all pass
- [x] 4.6 Run `lsp_diagnostics` on `src/` and verify no new errors introduced
