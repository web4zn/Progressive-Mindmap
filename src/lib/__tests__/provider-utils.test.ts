import { describe, it, expect } from 'vitest'
import {
  isLocalEndpoint,
  normalizeEndpoint,
  requiresApiKey,
  resolveApiKey,
} from '../provider-utils'

describe('isLocalEndpoint', () => {
  it('detects common local hosts', () => {
    expect(isLocalEndpoint('http://localhost:11434/v1')).toBe(true)
    expect(isLocalEndpoint('http://127.0.0.1:1234/v1')).toBe(true)
    expect(isLocalEndpoint('http://0.0.0.0:8080/v1')).toBe(true)
    expect(isLocalEndpoint('http://[::1]:11434/v1')).toBe(true)
    expect(isLocalEndpoint('http://ollama.localhost/v1')).toBe(true)
  })

  it('treats remote and invalid endpoints as non-local', () => {
    expect(isLocalEndpoint('https://api.openai.com/v1')).toBe(false)
    expect(isLocalEndpoint('http://192.168.1.10:11434/v1')).toBe(false)
    expect(isLocalEndpoint('not a url')).toBe(false)
    expect(isLocalEndpoint('')).toBe(false)
  })
})

describe('requiresApiKey', () => {
  it('requires a key only for remote endpoints', () => {
    expect(requiresApiKey('http://localhost:11434/v1')).toBe(false)
    expect(requiresApiKey('https://api.deepseek.com')).toBe(true)
  })
})

describe('normalizeEndpoint', () => {
  it('trims whitespace and trailing slashes', () => {
    expect(normalizeEndpoint(' https://api.openai.com/v1/ ')).toBe('https://api.openai.com/v1')
    expect(normalizeEndpoint('http://localhost:11434/v1///')).toBe('http://localhost:11434/v1')
    expect(normalizeEndpoint('https://api.deepseek.com')).toBe('https://api.deepseek.com')
  })
})

describe('resolveApiKey', () => {
  it('returns the stored key when present', () => {
    expect(resolveApiKey('https://api.openai.com/v1', ' sk-test ')).toBe('sk-test')
  })

  it('uses a placeholder for local endpoints with no key', () => {
    expect(resolveApiKey('http://localhost:11434/v1', '')).toBe('sk-local')
  })

  it('stays empty for remote endpoints with no key', () => {
    expect(resolveApiKey('https://api.openai.com/v1', '')).toBe('')
  })
})
