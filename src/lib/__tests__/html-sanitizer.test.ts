import { describe, it, expect } from 'vitest'
import { sanitizeHtml } from '../html-sanitizer'

describe('sanitizeHtml', () => {
  describe('XSS protection', () => {
    it('strips script tags', () => {
      const result = sanitizeHtml('<script>alert("xss")</script>')
      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
    })

    it('strips event handlers', () => {
      const result = sanitizeHtml('<div onclick="alert(1)">text</div>')
      expect(result).not.toContain('onclick')
      expect(result).toContain('<div>')
      expect(result).toContain('text')
    })

    it('strips onerror handlers', () => {
      const result = sanitizeHtml('<img onerror="alert(1)" src=x>')
      expect(result).not.toContain('onerror')
    })

    it('strips onload handlers', () => {
      const result = sanitizeHtml('<body onload="evil()">content</body>')
      expect(result).not.toContain('onload')
      expect(result).not.toContain('evil')
    })

    it('strips iframe tags', () => {
      const result = sanitizeHtml('<iframe src="https://evil.com"></iframe>')
      expect(result).not.toContain('<iframe')
      expect(result).not.toContain('evil.com')
    })

    it('strips img tags', () => {
      const result = sanitizeHtml('<img src="x" alt="pic">')
      expect(result).not.toContain('<img')
    })

    it('strips style tags', () => {
      const result = sanitizeHtml('<style>body { color: red; }</style>')
      expect(result).not.toContain('<style>')
      expect(result).not.toContain('color')
    })

    it('strips svg tags', () => {
      const result = sanitizeHtml('<svg><circle r="10"/></svg>')
      expect(result).not.toContain('<svg')
    })

    it('handles javascript: URLs in hrefs', () => {
      // DOMPurify should strip javascript: protocol by default
      const result = sanitizeHtml('<a href="javascript:alert(1)">click</a>')
      // The tag may survive but the href should be sanitized
      expect(result).not.toContain('javascript:')
    })
  })

  describe('allowed tags', () => {
    it('preserves h2-h4 headings', () => {
      const result = sanitizeHtml('<h2>A</h2><h3>B</h3><h4>C</h4>')
      expect(result).toContain('<h2>')
      expect(result).toContain('<h3>')
      expect(result).toContain('<h4>')
    })

    it('preserves paragraph and line break', () => {
      const result = sanitizeHtml('<p>hello<br>world</p>')
      expect(result).toContain('<p>')
      expect(result).toContain('<br>')
    })

    it('preserves lists', () => {
      const result = sanitizeHtml('<ul><li>a</li><li>b</li></ul><ol><li>1</li></ol>')
      expect(result).toContain('<ul>')
      expect(result).toContain('<ol>')
      expect(result).toContain('<li>')
    })

    it('preserves code blocks', () => {
      const result = sanitizeHtml('<pre><code>const x = 1</code></pre>')
      expect(result).toContain('<pre>')
      expect(result).toContain('<code>')
    })

    it('preserves strong and em', () => {
      const result = sanitizeHtml('<strong>bold</strong><em>italic</em>')
      expect(result).toContain('<strong>')
      expect(result).toContain('<em>')
    })

    it('preserves links with href', () => {
      const result = sanitizeHtml('<a href="https://example.com">link</a>')
      expect(result).toContain('<a')
      expect(result).toContain('href')
      expect(result).toContain('example.com')
    })

    it('preserves blockquote', () => {
      const result = sanitizeHtml('<blockquote>cited</blockquote>')
      expect(result).toContain('<blockquote>')
    })

    it('preserves table structure', () => {
      const result = sanitizeHtml(
        '<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>D</td></tr></tbody></table>',
      )
      expect(result).toContain('<table>')
      expect(result).toContain('<thead>')
      expect(result).toContain('<tbody>')
      expect(result).toContain('<tr>')
      expect(result).toContain('<th>')
      expect(result).toContain('<td>')
    })

    it('preserves hr divider', () => {
      const result = sanitizeHtml('<hr>')
      expect(result).toContain('<hr>')
    })

    it('preserves span and div with class', () => {
      const result = sanitizeHtml('<span class="highlight">text</span><div class="box">div</div>')
      expect(result).toContain('<span')
      expect(result).toContain('<div')
      expect(result).toContain('class="highlight"')
    })
  })

  describe('attributes', () => {
    it('preserves allowed attributes', () => {
      const result = sanitizeHtml('<a href="https://x.com" title="tooltip">link</a>')
      expect(result).toContain('href="https://x.com"')
      expect(result).toContain('title="tooltip"')
    })

    it('strips disallowed attributes', () => {
      const result = sanitizeHtml('<p id="intro" data-x="y" style="color:red">text</p>')
      // style and id should be stripped (not in ALLOWED_ATTR)
      expect(result).not.toContain('style=')
      expect(result).not.toContain('id=')
      // DOMPurify keeps data-* attributes by default (safe)
      expect(result).toContain('text')
    })
  })

  describe('edge cases', () => {
    it('handles empty string', () => {
      const result = sanitizeHtml('')
      expect(result).toBe('')
    })

    it('handles plain text without tags', () => {
      const result = sanitizeHtml('just some text')
      expect(result).toBe('just some text')
    })

    it('handles nested safe HTML', () => {
      const result = sanitizeHtml('<div><h3>Title</h3><p>Content with <strong>bold</strong></p></div>')
      expect(result).toContain('<h3>')
      expect(result).toContain('<strong>')
    })

    it('handles HTML entities', () => {
      const result = sanitizeHtml('&lt;script&gt;alert(1)&lt;/script&gt;')
      // HTML entities should be preserved as text
      expect(result).toContain('&lt;')
      expect(result).toContain('&gt;')
    })
  })
})
