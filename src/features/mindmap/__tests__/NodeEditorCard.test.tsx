import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import NodeEditorCard from '../NodeEditorCard'
import type { MindMapNode } from '@/types/mindmap'

function makeNode(overrides: Partial<MindMapNode> = {}): MindMapNode {
  return {
    id: overrides.id ?? 'n1',
    label: overrides.label ?? 'Test',
    summary: overrides.summary ?? '',
    content: overrides.content,
    contentType: overrides.contentType,
    children: [],
    editedByUser: false,
  }
}

// Render helper. The new card lives in the DOM at all times so
// the slide-in / fade-in transition can play; tests that don't
// care about the open state pass `open={true}` to skip the
// transition classes.
function renderCard(props: Partial<React.ComponentProps<typeof NodeEditorCard>> = {}) {
  const node = props.node ?? makeNode()
  return render(
    <NodeEditorCard
      node={node}
      open={props.open ?? true}
      onConfirm={props.onConfirm ?? (() => {})}
      onCancel={props.onCancel ?? (() => {})}
    />,
  )
}

describe('NodeEditorCard — content type switching', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('defaults to text content type', () => {
    renderCard()
    expect(screen.getByRole('button', { name: '纯文本' })).toBeInTheDocument()
  })

  it('detects html content type from the node', () => {
    renderCard({ node: makeNode({ contentType: 'html', content: '<p>hi</p>' }) })
    // The toolbar should now be visible.
    expect(screen.getByTestId('modal-toolbar')).toBeInTheDocument()
  })

  it('detects markdown content type from the node', () => {
    renderCard({ node: makeNode({ contentType: 'markdown', content: '# hi' }) })
    expect(screen.getByTestId('modal-toolbar')).toBeInTheDocument()
  })

  it('switching to markdown renders the markdown toolbar (no table button)', () => {
    renderCard({ node: makeNode({ contentType: 'html' }) })
    // Switch to markdown
    fireEvent.click(screen.getByRole('button', { name: 'Markdown' }))
    // Table is htmlOnly, so it should NOT appear in the toolbar.
    expect(screen.queryByRole('button', { name: '表格' })).not.toBeInTheDocument()
  })

  it('hides the toolbar in plain text mode', () => {
    renderCard()
    expect(screen.queryByTestId('modal-toolbar')).not.toBeInTheDocument()
  })
})

describe('NodeEditorCard — confirm / cancel', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('calls onConfirm with label + summary on confirm', () => {
    const onConfirm = vi.fn()
    renderCard({
      node: makeNode({ label: 'L', summary: 'S' }),
      onConfirm,
    })
    fireEvent.click(screen.getByTestId('node-editor-confirm'))
    expect(onConfirm).toHaveBeenCalledWith('n1', 'L', 'S', undefined, 'text')
  })

  it('calls onCancel on cancel button', () => {
    const onCancel = vi.fn()
    renderCard({ onCancel })
    fireEvent.click(screen.getByTestId('node-editor-cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('does not confirm when label is blank', () => {
    const onConfirm = vi.fn()
    renderCard({
      node: makeNode({ label: '' }),
      onConfirm,
    })
    fireEvent.click(screen.getByTestId('node-editor-confirm'))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('NodeEditorCard — toolbar insertAtCursor (HTML mode)', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })
  afterEach(() => {
    document.body.style.overflow = ''
  })

  function getContentTextarea() {
    // In HTML mode the content textarea is the only one with the
    // <h3> / <h4> placeholder hint.
    return screen.getByPlaceholderText(/<h3>标题<\/h3>/) as HTMLTextAreaElement
  }

  it('inserts wrap snippet at caret when no selection', () => {
    renderCard({ node: makeNode({ contentType: 'html', content: '' }) })
    const ta = getContentTextarea()
    fireEvent.change(ta, { target: { value: '' } })
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: '加粗' }))
    expect(ta.value).toBe('<strong>加粗文本</strong>')
  })

  it('wraps the existing selection', () => {
    renderCard({ node: makeNode({ contentType: 'html', content: 'hello' }) })
    const ta = getContentTextarea()
    ta.setSelectionRange(0, 5)
    fireEvent.click(screen.getByRole('button', { name: '加粗' }))
    expect(ta.value).toBe('<strong>hello</strong>')
  })

  it('inserts a block snippet (H3) at caret', () => {
    renderCard({ node: makeNode({ contentType: 'html', content: '' }) })
    const ta = getContentTextarea()
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: 'H3' }))
    expect(ta.value).toBe('<h3>小节标题</h3>')
  })

  it('inserts an H2 block', () => {
    renderCard({ node: makeNode({ contentType: 'html', content: '' }) })
    const ta = getContentTextarea()
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: 'H2' }))
    expect(ta.value).toBe('<h2>节标题</h2>')
  })

  it('inserts a Table 3x3 block', () => {
    renderCard({ node: makeNode({ contentType: 'html', content: '' }) })
    const ta = getContentTextarea()
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: '表格' }))
    expect(ta.value).toMatch(/<table>/)
    expect(ta.value).toMatch(/<th>列1<\/th>/)
    expect(ta.value).toMatch(/<td>/)
  })

  it('inserts an Image block', () => {
    renderCard({ node: makeNode({ contentType: 'html', content: '' }) })
    const ta = getContentTextarea()
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: '图片' }))
    expect(ta.value).toMatch(/<img src=/)
    expect(ta.value).toMatch(/alt="/)
  })
})

describe('NodeEditorCard — markdown toolbar', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })
  afterEach(() => {
    document.body.style.overflow = ''
  })

  function getMdTextarea() {
    return screen.getByPlaceholderText(/# 标题/) as HTMLTextAreaElement
  }

  it('inserts markdown bold (**)', () => {
    renderCard({ node: makeNode({ contentType: 'markdown', content: '' }) })
    const ta = getMdTextarea()
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: '加粗' }))
    expect(ta.value).toBe('**加粗文本**')
  })

  it('inserts markdown heading with #', () => {
    renderCard({ node: makeNode({ contentType: 'markdown', content: '' }) })
    const ta = getMdTextarea()
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: 'H2' }))
    expect(ta.value).toBe('## 节标题')
  })

  it('inserts markdown link', () => {
    renderCard({ node: makeNode({ contentType: 'markdown', content: '' }) })
    const ta = getMdTextarea()
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: '链接' }))
    expect(ta.value).toBe('[链接文字](https://)')
  })

  it('does not show the Table button in markdown mode', () => {
    renderCard({ node: makeNode({ contentType: 'markdown', content: '' }) })
    expect(screen.queryByRole('button', { name: '表格' })).not.toBeInTheDocument()
  })
})

describe('NodeEditorCard — markdown preview', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('renders markdown in the preview pane', () => {
    renderCard({
      node: makeNode({ contentType: 'markdown', content: '# Heading' }),
    })
    // The split view is default; the preview pane should contain
    // an <h1> with "Heading".
    const html = document.body.innerHTML
    expect(html).toMatch(/<h1[^>]*>Heading<\/h1>/)
  })

  it('sanitizes dangerous HTML in markdown output', () => {
    renderCard({
      node: makeNode({
        contentType: 'markdown',
        content: 'Hello <script>alert(1)</script> world',
      }),
    })
    const html = document.body.innerHTML
    expect(html).not.toMatch(/<script/i)
  })
})

describe('NodeEditorCard — open / closed animation states', () => {
  it('applies open classes when open is true', () => {
    renderCard({ open: true })
    const card = screen.getByTestId('node-editor-card')
    expect(card.className).toContain('opacity-100')
    expect(card.className).toContain('pointer-events-auto')
    expect(card).toHaveAttribute('aria-hidden', 'false')
  })

  it('applies closed classes when open is false', () => {
    renderCard({ open: false })
    const card = screen.getByTestId('node-editor-card')
    expect(card.className).toContain('opacity-0')
    expect(card.className).toContain('pointer-events-none')
    expect(card).toHaveAttribute('aria-hidden', 'true')
  })

  it('does NOT set body.style.overflow (no scroll lock)', () => {
    document.body.style.overflow = ''
    renderCard()
    expect(document.body.style.overflow).toBe('')
  })
})

describe('NodeEditorCard — Esc to close', () => {
  it('calls onCancel when the user presses Esc', () => {
    const onCancel = vi.fn()
    renderCard({ onCancel })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })

  it('does NOT call onCancel on Esc when the card is closed', () => {
    const onCancel = vi.fn()
    renderCard({ onCancel, open: false })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
  })
})

describe('NodeEditorCard — resizable width', () => {
  const STORAGE_KEY = 'progressive-mindmap:node-editor-width'

  beforeEach(() => {
    document.body.style.overflow = ''
    window.localStorage.removeItem(STORAGE_KEY)
  })
  afterEach(() => {
    document.body.style.overflow = ''
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.localStorage.removeItem(STORAGE_KEY)
  })

  it('exposes a corner resize grip modelled on the old modal handle', () => {
    renderCard()
    const handle = screen.getByTestId('node-editor-resize-handle')
    expect(handle).toBeInTheDocument()
    // The grip lives in the bottom-left corner (card is
    // anchored to `right-3`, so the right edge is fixed
    // and the user widens by pulling the LEFT side).
    expect(handle.className).toContain('left-1.5')
    expect(handle.className).toContain('bottom-1.5')
    // 18×18 — small enough not to get in the way, big
    // enough to land without aiming.
    expect(handle.className).toContain('w-[18px]')
    expect(handle.className).toContain('h-[18px]')
    // ew-resize because only width is adjusted (the hook
    // uses `direction: 'l'` so height is intentionally
    // ignored even though dh is non-zero).
    expect(handle.className).toContain('cursor-ew-resize')
    // The visible affordance is a 6-dot diagonal grip SVG,
    // the same one the deleted `MindMapEditModal` used in
    // its bottom-right corner — mirrored across the
    // vertical axis so the density gradient points at the
    // LEFT-bottom corner where the grip actually lives.
    const grip = screen.getByTestId('node-editor-resize-grip')
    expect(grip).toBeInTheDocument()
    expect(grip.tagName.toLowerCase()).toBe('svg')
    const dots = grip.querySelectorAll('circle')
    expect(dots).toHaveLength(6)
    // Density orientation: in a 16×16 viewBox the column at
    // x=3 should have 3 dots (the most), x=7 should have 2,
    // x=11 should have 1. That is the leftward-pointing
    // gradient — an earlier iteration got this wrong and
    // pointed the gradient at the right (i.e. away from
    // the actual grip), which the user immediately noticed.
    const columnCounts: Record<string, number> = { '3': 0, '7': 0, '11': 0 }
    dots.forEach((dot) => {
      const cx = dot.getAttribute('cx') ?? ''
      if (cx in columnCounts) columnCounts[cx] = (columnCounts[cx] ?? 0) + 1
    })
    expect(columnCounts['3']).toBe(3)
    expect(columnCounts['7']).toBe(2)
    expect(columnCounts['11']).toBe(1)
    // The handle should announce itself for assistive tech.
    expect(handle.getAttribute('aria-label')).toMatch(/宽度/)
  })

  it('uses the default 420px width when no value is stored', () => {
    renderCard()
    const card = screen.getByTestId('node-editor-card') as HTMLElement
    // The card carries the live width on its inline style; the
    // small-viewport gutter lives in a Tailwind utility (the
    // `max-w-[calc(100vw-24px)]` class — happy-dom doesn't
    // compute those but the production browser does).
    expect(card.style.width).toBe('420px')
    expect(card.className).toContain('max-w-[calc(100vw-24px)]')
  })

  it('reads a stored width from localStorage on mount', () => {
    window.localStorage.setItem(STORAGE_KEY, '560')
    renderCard()
    const card = screen.getByTestId('node-editor-card') as HTMLElement
    expect(card.style.width).toBe('560px')
  })

  it('clamps a stored width to the supported [360, 640] range', () => {
    // Garbage in, defaults out — protects against bad data
    // left over from a previous schema / manual edits.
    window.localStorage.setItem(STORAGE_KEY, '50')
    renderCard()
    const card = screen.getByTestId('node-editor-card') as HTMLElement
    expect(card.style.width).toBe('360px')
  })

  it('persists the chosen width to localStorage on drag', () => {
    renderCard()
    const handle = screen.getByTestId('node-editor-resize-handle')
    // All three events are wrapped in `act` because the hook
    // calls setState synchronously from the window-level
    // mousemove handler — without `act` React will warn and the
    // assertion can race the re-render.
    act(() => {
      fireEvent.mouseDown(handle, { clientX: 0, clientY: 0 })
    })
    act(() => {
      // Drag 100px to the LEFT — width grows by 100 (520px).
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: -100, clientY: 0 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('520')
  })

  it('clamps the dragged width to the configured maximum (640px)', () => {
    renderCard()
    const handle = screen.getByTestId('node-editor-resize-handle')
    act(() => {
      fireEvent.mouseDown(handle, { clientX: 0, clientY: 0 })
    })
    act(() => {
      // Try to grow by 9999px.
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: -9999, clientY: 0 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })

    const card = screen.getByTestId('node-editor-card') as HTMLElement
    expect(card.style.width).toBe('640px')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('640')
  })

  it('resets to the stored width when the handle is double-clicked', () => {
    // Pre-store a non-default width.
    window.localStorage.setItem(STORAGE_KEY, '500')
    renderCard()
    const handle = screen.getByTestId('node-editor-resize-handle')
    act(() => {
      fireEvent.mouseDown(handle, { clientX: 0, clientY: 0 })
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: -80, clientY: 0 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })

    const card = screen.getByTestId('node-editor-card') as HTMLElement
    expect(card.style.width).toBe('580px')

    // Double-click the handle — should reset to the defaultSize
    // (i.e. the value the hook was constructed with, which is
    // the value read from localStorage on mount = 500px).
    act(() => {
      fireEvent.doubleClick(handle)
    })

    expect(card.style.width).toBe('500px')
  })
})
