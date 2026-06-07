import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MindMapCombobox from '../MindMapCombobox'
import type { MindMap } from '@/types/mindmap'

function makeMindmap(id: string, title: string): MindMap {
  return {
    id,
    title,
    tree: [],
    monitoredConversationIds: [],
    createdAt: 0,
    updatedAt: 0,
  }
}

const sample: MindMap[] = [
  makeMindmap('mm-1', 'React 学习'),
  makeMindmap('mm-2', 'Vue 入门'),
  makeMindmap('mm-3', '架构设计'),
]

describe('MindMapCombobox', () => {
  beforeEach(() => {
    // happy-dom doesn't implement pointer capture; nothing to reset.
  })

  it('renders the selected title in the trigger', () => {
    render(<MindMapCombobox mindmaps={sample} value="mm-1" onSelect={() => {}} onRename={() => {}} />)
    expect(screen.getByRole('button', { name: '选择图谱' })).toHaveTextContent('React 学习')
  })

  it('falls back to the placeholder when nothing is selected', () => {
    render(<MindMapCombobox mindmaps={sample} value={null} onSelect={() => {}} onRename={() => {}} />)
    expect(screen.getByRole('button', { name: '选择图谱' })).toHaveTextContent('选择图谱…')
  })

  it('opens the listbox and renders every mindmap', () => {
    render(<MindMapCombobox mindmaps={sample} value="mm-1" onSelect={() => {}} onRename={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '选择图谱' }))
    const listbox = screen.getByRole('listbox')
    for (const m of sample) {
      expect(listbox.textContent).toContain(m.title)
    }
  })

  it('filters the list by query (case-insensitive)', () => {
    render(<MindMapCombobox mindmaps={sample} value={null} onSelect={() => {}} onRename={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '选择图谱' }))

    const search = screen.getByRole('textbox', { name: '搜索图谱' })
    fireEvent.change(search, { target: { value: 'vue' } })

    expect(screen.getByText('Vue 入门')).toBeInTheDocument()
    expect(screen.queryByText('React 学习')).not.toBeInTheDocument()
    expect(screen.queryByText('架构设计')).not.toBeInTheDocument()
  })

  it('shows empty state when nothing matches', () => {
    render(<MindMapCombobox mindmaps={sample} value={null} onSelect={() => {}} onRename={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '选择图谱' }))
    const search = screen.getByRole('textbox', { name: '搜索图谱' })
    fireEvent.change(search, { target: { value: 'nonexistent' } })
    expect(screen.getByText('没有匹配的图谱')).toBeInTheDocument()
  })

  it('calls onSelect with the chosen id', () => {
    const onSelect = vi.fn()
    render(<MindMapCombobox mindmaps={sample} value="mm-1" onSelect={onSelect} onRename={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '选择图谱' }))
    fireEvent.click(screen.getByText('Vue 入门'))
    expect(onSelect).toHaveBeenCalledWith('mm-2')
  })

  it('Enter on the search input selects the highlighted option', () => {
    const onSelect = vi.fn()
    render(<MindMapCombobox mindmaps={sample} value="mm-1" onSelect={onSelect} onRename={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '选择图谱' }))
    // Highlight starts at 0 = sample[0] (React 学习). ArrowDown to 1.
    const search = screen.getByRole('textbox', { name: '搜索图谱' })
    fireEvent.keyDown(search, { key: 'ArrowDown' })
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('mm-2')
  })

  it('inline rename: pencil → input → Enter calls onRename', () => {
    const onRename = vi.fn()
    render(<MindMapCombobox mindmaps={sample} value="mm-1" onSelect={() => {}} onRename={onRename} />)
    fireEvent.click(screen.getByRole('button', { name: '选择图谱' }))

    // Open the rename input on the Vue 入门 row.
    fireEvent.click(screen.getByRole('button', { name: '重命名「Vue 入门」' }))

    const renameInput = screen.getByDisplayValue('Vue 入门')
    fireEvent.change(renameInput, { target: { value: 'Vue 3 进阶' } })
    fireEvent.keyDown(renameInput, { key: 'Enter' })

    expect(onRename).toHaveBeenCalledWith('mm-2', 'Vue 3 进阶')
  })

  it('inline rename: Esc cancels without calling onRename', () => {
    const onRename = vi.fn()
    render(<MindMapCombobox mindmaps={sample} value="mm-1" onSelect={() => {}} onRename={onRename} />)
    fireEvent.click(screen.getByRole('button', { name: '选择图谱' }))
    fireEvent.click(screen.getByRole('button', { name: '重命名「架构设计」' }))

    const renameInput = screen.getByDisplayValue('架构设计')
    fireEvent.change(renameInput, { target: { value: 'WRONG' } })
    fireEvent.keyDown(renameInput, { key: 'Escape' })

    expect(onRename).not.toHaveBeenCalled()
  })

  it('inline rename: double-click on the row also enters edit mode', () => {
    const onRename = vi.fn()
    render(<MindMapCombobox mindmaps={sample} value="mm-1" onSelect={() => {}} onRename={onRename} />)
    fireEvent.click(screen.getByRole('button', { name: '选择图谱' }))

    const listbox = screen.getByRole('listbox')
    const rows = listbox.querySelectorAll('[role="option"]')
    // The currently-selected option is the first row (React 学习).
    const row = rows[0] as HTMLElement
    fireEvent.doubleClick(row)
    // After dblclick, a fresh input is mounted. The first row title
    // appears in the trigger AND in the row's title attribute, so we
    // query by display-value to find the editable input.
    const renameInput = screen.getByDisplayValue('React 学习') as HTMLInputElement
    fireEvent.change(renameInput, { target: { value: 'React Hooks' } })
    fireEvent.keyDown(renameInput, { key: 'Enter' })
    expect(onRename).toHaveBeenCalledWith('mm-1', 'React Hooks')
  })

  it('does not call onRename when the rename is empty after trim', () => {
    const onRename = vi.fn()
    render(<MindMapCombobox mindmaps={sample} value="mm-1" onSelect={() => {}} onRename={onRename} />)
    fireEvent.click(screen.getByRole('button', { name: '选择图谱' }))
    fireEvent.click(screen.getByRole('button', { name: '重命名「React 学习」' }))

    const renameInput = screen.getByDisplayValue('React 学习')
    fireEvent.change(renameInput, { target: { value: '   ' } })
    fireEvent.keyDown(renameInput, { key: 'Enter' })
    expect(onRename).not.toHaveBeenCalled()
  })

  it('respects the disabled prop', () => {
    render(
      <MindMapCombobox
        mindmaps={sample}
        value="mm-1"
        onSelect={() => {}}
        onRename={() => {}}
        disabled
      />,
    )
    const trigger = screen.getByRole('button', { name: '选择图谱' }) as HTMLButtonElement
    expect(trigger).toBeDisabled()
  })
})
