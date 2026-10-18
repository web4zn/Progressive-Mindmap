import { describe, it, expect } from 'vitest'
import {
  buildContentSecurityPolicy,
  isAllowedAppNavigation,
  isFileUrl,
  isHttpUrl,
  isSameOrigin,
  shouldAllowPermission,
} from '../desktop-security'

const DEV_URL = 'http://localhost:5173'

describe('buildContentSecurityPolicy', () => {
  it('locks production scripts to self and allows inline styles', () => {
    const csp = buildContentSecurityPolicy(false)
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'; style-src 'self' 'unsafe-inline'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('allows user-configured LLM endpoints through connect-src', () => {
    const csp = buildContentSecurityPolicy(false)
    expect(csp).toContain("connect-src 'self' https: http:")
  })

  it('relaxes scripts and websockets in development only', () => {
    const csp = buildContentSecurityPolicy(true)
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
    expect(csp).toContain('ws:')
    expect(buildContentSecurityPolicy(false)).not.toContain('ws:')
  })
})

describe('URL predicates', () => {
  it('compares origins, not string prefixes', () => {
    expect(isSameOrigin('http://localhost:5173/index.html', DEV_URL)).toBe(true)
    expect(isSameOrigin('http://localhost:5173.evil.com/', DEV_URL)).toBe(false)
    expect(isSameOrigin('http://localhost:9999/', DEV_URL)).toBe(false)
    expect(isSameOrigin('not a url', DEV_URL)).toBe(false)
  })

  it('recognises http(s) and file URLs', () => {
    expect(isHttpUrl('https://example.com')).toBe(true)
    expect(isHttpUrl('http://localhost:11434/v1')).toBe(true)
    expect(isHttpUrl('file:///etc/passwd')).toBe(false)
    expect(isHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isFileUrl('file:///C:/app/out/renderer/index.html')).toBe(true)
    expect(isFileUrl('https://example.com')).toBe(false)
  })
})

describe('isAllowedAppNavigation', () => {
  it('allows only the dev-server origin in development', () => {
    expect(isAllowedAppNavigation(`${DEV_URL}/`, { isDev: true, devServerUrl: DEV_URL })).toBe(
      true,
    )
    expect(
      isAllowedAppNavigation('https://evil.example', { isDev: true, devServerUrl: DEV_URL }),
    ).toBe(false)
  })

  it('allows only file URLs in production', () => {
    expect(
      isAllowedAppNavigation('file:///C:/app/out/renderer/index.html', {
        isDev: false,
        devServerUrl: DEV_URL,
      }),
    ).toBe(true)
    expect(
      isAllowedAppNavigation('https://example.com', { isDev: false, devServerUrl: DEV_URL }),
    ).toBe(false)
  })
})

describe('shouldAllowPermission', () => {
  it('allows clipboard write and denies everything else', () => {
    expect(shouldAllowPermission('clipboard-sanitized-write')).toBe(true)
    expect(shouldAllowPermission('clipboard-read')).toBe(false)
    expect(shouldAllowPermission('media')).toBe(false)
    expect(shouldAllowPermission('geolocation')).toBe(false)
    expect(shouldAllowPermission('notifications')).toBe(false)
  })
})
