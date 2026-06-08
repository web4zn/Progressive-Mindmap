import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import SmoothstepEdge from '../edges/SmoothstepEdge'
import BezierEdge from '../edges/BezierEdge'
import StraightEdge from '../edges/StraightEdge'
import { edgeComponents } from '../edges'
import { getEdgeStrategy } from '@/lib/edges/registry'
import type { EdgeProps } from '@xyflow/react'

function makeProps(overrides: Partial<EdgeProps> = {}): EdgeProps {
  return {
    id: 'e1',
    source: 's1',
    target: 't1',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 0,
    sourcePosition: undefined as never,
    targetPosition: undefined as never,
    ...overrides,
  } as unknown as EdgeProps
}

describe('edgeComponents map', () => {
  it('exports one component for every EdgeStyleName', () => {
    expect(Object.keys(edgeComponents).sort()).toEqual(['bezier', 'smoothstep', 'straight'])
  })

  it('matches the edge registry 1:1', () => {
    for (const [name, component] of Object.entries(edgeComponents)) {
      const strategy = getEdgeStrategy(name)
      expect(strategy.edgeComponent).toBe(component)
    }
  })
})

describe('SmoothstepEdge', () => {
  it('renders a path with the smoothstep class', () => {
    const { container } = render(<SmoothstepEdge {...makeProps()} />)
    const path = container.querySelector('.flow-edge-smoothstep')
    expect(path).not.toBeNull()
  })
})

describe('BezierEdge', () => {
  it('renders a path with the bezier class', () => {
    const { container } = render(<BezierEdge {...makeProps()} />)
    const path = container.querySelector('.flow-edge-bezier')
    expect(path).not.toBeNull()
  })
})

describe('StraightEdge', () => {
  it('renders a path with the straight class', () => {
    const { container } = render(<StraightEdge {...makeProps()} />)
    const path = container.querySelector('.flow-edge-straight')
    expect(path).not.toBeNull()
  })
})
