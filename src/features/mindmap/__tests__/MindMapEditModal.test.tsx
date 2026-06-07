import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import MindMapEditModal from '../MindMapEditModal'
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

describe('MindMapEditModal — body scroll lock', () => {
  it('locks body scroll on mount and restores on unmount', () => {
    const original = document.body.style.overflow
    const { unmount } = render(
      <MindMapEditModal node={makeNode()} onConfirm={() => {}} onCancel={() => {}} />,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe(original)
  })

  it('restores the previous overflow value, not a hardcoded empty string', () => {
    document.body.style.overflow = 'scroll'
    const { unmount } = render(
      <MindMapEditModal node={makeNode()} onConfirm={() => {}} onCancel={() => {}} />,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('scroll')
    document.body.style.overflow = ''
  })

  it('nested open/close cycles do not leak styles', () => {
    const { unmount } = render(
      <MindMapEditModal node={makeNode()} onConfirm={() => {}} onCancel={() => {}} />,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })
})

describe('MindMapEditModal — content type switching', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('defaults to text content type', () => {
    render(<MindMapEditModal node={makeNode()} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByRole('button', { name: '纯文本' })).toBeInTheDocument()
  })

  it('detects html content type from the node', () => {
    render(
      <MindMapEditModal
        node={makeNode({ contentType: 'html', content: '<p>hi</p>' })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    // The toolbar should now be visible.
    expect(screen.getByTestId('modal-toolbar')).toBeInTheDocument()
  })

  it('detects markdown content type from the node', () => {
    render(
      <MindMapEditModal
        node={makeNode({ contentType: 'markdown', content: '# hi' })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByTestId('modal-toolbar')).toBeInTheDocument()
  })

  it('switching to markdown renders the markdown toolbar (no table button)', () => {
    render(
      <MindMapEditModal
        node={makeNode({ contentType: 'html' })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    // Switch to markdown
    fireEvent.click(screen.getByRole('button', { name: 'Markdown' }))
    // Table is htmlOnly, so it should NOT appear in the toolbar.
    expect(screen.queryByRole('button', { name: '表格' })).not.toBeInTheDocument()
  })

  it('hides the toolbar in plain text mode', () => {
    render(<MindMapEditModal node={makeNode()} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.queryByTestId('modal-toolbar')).not.toBeInTheDocument()
  })
})

describe('MindMapEditModal — confirm / cancel', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('calls onConfirm with label + summary on confirm', () => {
    const onConfirm = vi.fn()
    render(
      <MindMapEditModal
        node={makeNode({ label: 'L', summary: 'S' })}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '确认' }))
    expect(onConfirm).toHaveBeenCalledWith('n1', 'L', 'S', undefined, 'text')
  })

  it('calls onCancel on cancel button', () => {
    const onCancel = vi.fn()
    render(
      <MindMapEditModal node={makeNode()} onConfirm={() => {}} onCancel={onCancel} />,
    )
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('does not confirm when label is blank', () => {
    const onConfirm = vi.fn()
    render(
      <MindMapEditModal
        node={makeNode({ label: '' })}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '确认' }))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('MindMapEditModal — toolbar insertAtCursor (HTML mode)', () => {
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
    render(
      <MindMapEditModal
        node={makeNode({ contentType: 'html', content: '' })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const ta = getContentTextarea()
    // Place caret at offset 0.
    fireEvent.change(ta, { target: { value: '' } })
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: '加粗' }))
    // The bold wrap should have inserted "<strong>加粗文本</strong>".
    expect(ta.value).toBe('<strong>加粗文本</strong>')
  })

  it('wraps the existing selection', () => {
    render(
      <MindMapEditModal
        node={makeNode({ contentType: 'html', content: 'hello' })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const ta = getContentTextarea()
    ta.setSelectionRange(0, 5)
    fireEvent.click(screen.getByRole('button', { name: '加粗' }))
    expect(ta.value).toBe('<strong>hello</strong>')
  })

  it('inserts a block snippet (H3) at caret', () => {
    render(
      <MindMapEditModal
        node={makeNode({ contentType: 'html', content: '' })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const ta = getContentTextarea()
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: 'H3' }))
    expect(ta.value).toBe('<h3>小节标题</h3>')
  })

  it('inserts an H2 block', () => {
    render(
      <MindMapEditModal
        node={makeNode({ contentType: 'html', content: '' })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const ta = getContentTextarea()
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: 'H2' }))
    expect(ta.value).toBe('<h2>节标题</h2>')
  })

  it('inserts a Table 3x3 block', () => {
    render(
      <MindMapEditModal
        node={makeNode({ contentType: 'html', content: '' })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const ta = getContentTextarea()
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: '表格' }))
    expect(ta.value).toMatch(/<table>/)
    expect(ta.value).toMatch(/<th>列1<\/th>/)
    expect(ta.value).toMatch(/<td>/)
  })

  it('inserts an Image block', () => {
    render(
      <MindMapEditModal
        node={makeNode({ contentType: 'html', content: '' })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const ta = getContentTextarea()
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: '图片' }))
    expect(ta.value).toMatch(/<img src=/)
    expect(ta.value).toMatch(/alt="/)
  })
})

describe('MindMapEditModal — markdown toolbar', () => {
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
    render(
      <MindMapEditModal
        node={makeNode({ contentType: 'markdown', content: '' })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const ta = getMdTextarea()
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: '加粗' }))
    expect(ta.value).toBe('**加粗文本**')
  })

  it('inserts markdown heading with #', () => {
    render(
      <MindMapEditModal
        node={makeNode({ contentType: 'markdown', content: '' })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const ta = getMdTextarea()
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: 'H2' }))
    expect(ta.value).toBe('## 节标题')
  })

  it('inserts markdown link', () => {
    render(
      <MindMapEditModal
        node={makeNode({ contentType: 'markdown', content: '' })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const ta = getMdTextarea()
    ta.setSelectionRange(0, 0)
    fireEvent.click(screen.getByRole('button', { name: '链接' }))
    expect(ta.value).toBe('[链接文字](https://)')
  })

  it('does not show the Table button in markdown mode', () => {
    render(
      <MindMapEditModal
        node={makeNode({ contentType: 'markdown', content: '' })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: '表格' })).not.toBeInTheDocument()
  })
})

describe('MindMapEditModal — markdown preview', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('renders markdown in the preview pane', () => {
    render(
      <MindMapEditModal
        node={makeNode({ contentType: 'markdown', content: '# Heading' })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    // The split view is default; the preview pane should contain
    // an <h1> with "Heading".
    const html = document.body.innerHTML
    expect(html).toMatch(/<h1[^>]*>Heading<\/h1>/)
  })

  it('sanitizes dangerous HTML in markdown output', () => {
    render(
      <MindMapEditModal
        node={makeNode({
          contentType: 'markdown',
          content: 'Hello <script>alert(1)</script> world',
        })}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    )
    const html = document.body.innerHTML
    expect(html).not.toMatch(/<script/i)
  })
})

describe('MindMapEditModal — resize handle', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })
  afterEach(() => {
    document.body.style.overflow = ''
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })

  it('exposes a resize handle in the corner', () => {
    render(<MindMapEditModal node={makeNode()} onConfirm={() => {}} onCancel={() => {}} />)
    expect(screen.getByTestId('modal-resize-handle')).toBeInTheDocument()
  })

  it('clamps the size to the max when the user drags too far', () => {
    render(<MindMapEditModal node={makeNode()} onConfirm={() => {}} onCancel={() => {}} />)
    const handle = screen.getByTestId('modal-resize-handle')

    act(() => {
      fireEvent.mouseDown(handle, { clientX: 0, clientY: 0 })
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10000, clientY: 10000 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'))
    })

    // The modal div should now have its width clamped to 900.
    const modal = screen.getByTestId('mindmap-edit-modal').querySelector(
      '.relative.bg-popover',
    ) as HTMLElement
    expect(modal.style.width).toBe('900px')
  })
})
