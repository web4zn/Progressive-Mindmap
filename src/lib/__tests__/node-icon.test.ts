import { describe, it, expect } from 'vitest'
import { selectNodeIcon } from '../node-icon'

describe('selectNodeIcon', () => {
  it('auto pattern never returns an icon', () => {
    expect(selectNodeIcon({ pattern: 'auto', label: '任何标签' })).toBeNull()
    expect(selectNodeIcon({ pattern: 'auto', label: 'Who is X' })).toBeNull()
  })

  it('tech pattern returns Zap regardless of label', () => {
    expect(selectNodeIcon({ pattern: 'tech', label: '任何东西' })).toBe('Zap')
  })

  it('pros-cons pattern returns Scale regardless of label', () => {
    expect(selectNodeIcon({ pattern: 'pros-cons', label: 'pros' })).toBe('Scale')
  })

  it('5w1h matches Who by English and Chinese keywords', () => {
    expect(selectNodeIcon({ pattern: '5w1h', label: 'Who leads the team' })).toBe('User')
    expect(selectNodeIcon({ pattern: '5w1h', label: '谁是负责人' })).toBe('User')
  })

  it('5w1h matches What/When/Where/Why/How keywords', () => {
    expect(selectNodeIcon({ pattern: '5w1h', label: 'What is the goal' })).toBe('Lightbulb')
    expect(selectNodeIcon({ pattern: '5w1h', label: 'When does it ship' })).toBe('Clock')
    expect(selectNodeIcon({ pattern: '5w1h', label: 'Where to host the event' })).toBe('MapPin')
    expect(selectNodeIcon({ pattern: '5w1h', label: 'Why we chose Rust' })).toBe('HelpCircle')
    expect(selectNodeIcon({ pattern: '5w1h', label: 'How to scale the API' })).toBe('CircleHelp')
  })

  it('5w1h with no keyword match returns Circle', () => {
    expect(selectNodeIcon({ pattern: '5w1h', label: 'foobarbaz' })).toBe('Circle')
  })

  it('empty label returns null even for non-auto patterns', () => {
    expect(selectNodeIcon({ pattern: '5w1h', label: '   ' })).toBeNull()
  })
})
