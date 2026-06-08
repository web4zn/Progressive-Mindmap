import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import RectCardNode from '../nodes/RectCardNode'
import { BaseNode } from '../nodes/BaseNode'
import { nodeComponents } from '../nodes'
import { getNodeShape } from '@/lib/shapes/registry'
import type { FlowNodeData } from '../index'
import type { NodeProps } from '@xyflow/react'

// React Flow's <Handle> reads from the ReactFlow store, so each
// component must be rendered inside a provider. happy-dom does
// not implement ResizeObserver, so we stub it (mirrors the
// existing FlowNode.test.tsx setup).
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

function makeProps(dataOverrides: Partial<FlowNodeData> = {}, id = 'n1'): NodeProps {
  return {
    id,
    data: {
      label: 'Test',
      summary: '',
      content: '',
      contentType: undefined,
      depth: 0,
      pattern: 'auto',
      editedByUser: false,
      hasChildren: false,
      collapsed: false,
      expanded: false,
      ...dataOverrides,
    } as unknown as FlowNodeData,
    selected: false,
  } as unknown as NodeProps
}

function renderInProvider(ui: React.ReactNode) {
  return render(<ReactFlowProvider>{ui}</ReactFlowProvider>)
}

describe('nodeComponents map', () => {
  it('exports exactly one component (the rect card)', () => {
    // The mindmap v2 ships a single node presentation; the
    // chip / circle / stadium siblings were removed because they
    // hid body content.
    expect(Object.keys(nodeComponents).sort()).toEqual(['rect'])
  })

  it('matches the shape registry 1:1', () => {
    for (const [name, component] of Object.entries(nodeComponents)) {
      const shape = getNodeShape(name)
      expect(shape.nodeComponent).toBe(component)
    }
  })
})

describe('BaseNode', () => {
  it('renders the label', () => {
    const { getByText } = renderInProvider(
      <BaseNode
        id="n1"
        data={makeProps({ label: 'Hello' }).data as unknown as FlowNodeData}
        selected={false}
        header={null}
        body={null}
        footer={null}
        defaultSize={{ width: 200, height: 80 }}
      />,
    )
    expect(getByText('Hello')).toBeTruthy()
  })
})

describe('RectCardNode', () => {
  it('renders a flow-node card', () => {
    const { getByTestId } = renderInProvider(<RectCardNode {...makeProps({ label: 'Card' })} />)
    const root = getByTestId('flow-node-n1')
    expect(root.className).toContain('flow-node')
  })

  it('renders the summary in the body', () => {
    const { getByText } = renderInProvider(
      <RectCardNode {...makeProps({ label: 'Card', summary: 'short body' })} />,
    )
    expect(getByText('short body')).toBeTruthy()
  })
})

describe('selected / streaming / dimmed state classes', () => {
  it('applies the .selected class on selection', () => {
    const { getByTestId } = renderInProvider(
      <RectCardNode {...makeProps({ label: 'x' })} selected />,
    )
    expect(getByTestId('flow-node-n1').className).toContain('selected')
  })

  it('applies the .streaming class on streaming data', () => {
    const { getByTestId } = renderInProvider(
      <RectCardNode {...makeProps({ label: 'x', isStreaming: true })} />,
    )
    expect(getByTestId('flow-node-n1').className).toContain('streaming')
  })

  it('applies the .dimmed class on dimmed data', () => {
    const { getByTestId } = renderInProvider(
      <RectCardNode {...makeProps({ label: 'x', isDimmed: true })} />,
    )
    expect(getByTestId('flow-node-n1').className).toContain('dimmed')
  })

  it('applies the .search-match class on search-match data', () => {
    const { getByTestId } = renderInProvider(
      <RectCardNode {...makeProps({ label: 'x', isSearchMatch: true })} />,
    )
    expect(getByTestId('flow-node-n1').className).toContain('search-match')
  })

  it('applies the .has-user-edit class when editedByUser is true', () => {
    const { getByTestId } = renderInProvider(
      <RectCardNode {...makeProps({ label: 'x', editedByUser: true })} />,
    )
    expect(getByTestId('flow-node-n1').className).toContain('has-user-edit')
  })
})
