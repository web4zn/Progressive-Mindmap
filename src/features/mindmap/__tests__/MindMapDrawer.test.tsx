import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MindMapDrawer from '../MindMapDrawer'
import type { Conversation } from '@/types/conversation'

function makeConv(id: string, title: string, archived = false): Conversation {
  return {
    id,
    title,
    providerId: 'p',
    modelId: 'm',
    systemPrompt: '',
    messages: [],
    archived,
    createdAt: 0,
    updatedAt: 0,
  }
}

describe('MindMapDrawer', () => {
  it('does not render any list when closed', () => {
    render(
      <MindMapDrawer
        open={false}
        onClose={() => {}}
        conversations={[makeConv('c1', 'Hi')]}
        activeConversationId={null}
        onUnlink={() => {}}
      />,
    )
    const drawer = screen.getByTestId('mindmap-drawer')
    expect(drawer.getAttribute('data-state')).toBe('closed')
    expect(drawer).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders the linked conversations when open', () => {
    const convs = [makeConv('c1', '会话一'), makeConv('c2', '会话二')]
    render(
      <MindMapDrawer
        open
        onClose={() => {}}
        conversations={convs}
        activeConversationId={null}
        onUnlink={() => {}}
      />,
    )
    expect(screen.getByText('会话一')).toBeInTheDocument()
    expect(screen.getByText('会话二')).toBeInTheDocument()
    expect(screen.getByText('(2)')).toBeInTheDocument()
  })

  it('shows empty state with no conversations', () => {
    render(
      <MindMapDrawer
        open
        onClose={() => {}}
        conversations={[]}
        activeConversationId={null}
        onUnlink={() => {}}
      />,
    )
    expect(screen.getByText('未关联任何会话')).toBeInTheDocument()
  })

  it('shows the active conversation marker', () => {
    const convs = [makeConv('c1', '会话一'), makeConv('c2', '会话二')]
    render(
      <MindMapDrawer
        open
        onClose={() => {}}
        conversations={convs}
        activeConversationId="c1"
        onUnlink={() => {}}
      />,
    )
    expect(screen.getByText('(当前)')).toBeInTheDocument()
  })

  it('clicking the unlink button calls onUnlink with the id', () => {
    const onUnlink = vi.fn()
    render(
      <MindMapDrawer
        open
        onClose={() => {}}
        conversations={[makeConv('c1', '会话一')]}
        activeConversationId={null}
        onUnlink={onUnlink}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '取消关联「会话一」' }))
    expect(onUnlink).toHaveBeenCalledWith('c1')
  })

  it('clicking the overlay closes the drawer', () => {
    const onClose = vi.fn()
    const { container } = render(
      <MindMapDrawer
        open
        onClose={onClose}
        conversations={[]}
        activeConversationId={null}
        onUnlink={() => {}}
      />,
    )
    // First div in the fragment is the overlay (aria-hidden).
    const overlay = container.querySelector('[aria-hidden="true"]') as HTMLElement
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })

  it('clicking the close button closes the drawer', () => {
    const onClose = vi.fn()
    render(
      <MindMapDrawer
        open
        onClose={onClose}
        conversations={[]}
        activeConversationId={null}
        onUnlink={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '关闭抽屉' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('pressing Escape closes the drawer', () => {
    const onClose = vi.fn()
    render(
      <MindMapDrawer
        open
        onClose={onClose}
        conversations={[]}
        activeConversationId={null}
        onUnlink={() => {}}
      />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('does not bind Escape listener when closed', () => {
    const onClose = vi.fn()
    render(
      <MindMapDrawer
        open={false}
        onClose={onClose}
        conversations={[]}
        activeConversationId={null}
        onUnlink={() => {}}
      />,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows the mindmap subtitle when provided', () => {
    render(
      <MindMapDrawer
        open
        onClose={() => {}}
        conversations={[]}
        activeConversationId={null}
        onUnlink={() => {}}
        mindmapTitle="我的图谱"
      />,
    )
    expect(screen.getByText('我的图谱')).toBeInTheDocument()
  })
})
