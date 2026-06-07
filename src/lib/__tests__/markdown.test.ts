import { describe, it, expect } from 'vitest'
import { markdownToHtml, htmlToMarkdown } from '../markdown'
import { sanitizeHtml } from '../html-sanitizer'

describe('markdown <-> html conversion', () => {
  it('markdownToHtml returns empty string for empty input', () => {
    expect(markdownToHtml('')).toBe('')
    expect(markdownToHtml('   \n  ')).toBe('')
  })

  it('markdownToHtml renders headings, paragraphs, lists', () => {
    const md = `# Title

paragraph with **bold** and *italic*.

- one
- two
- three
`
    const html = markdownToHtml(md)
    // The exact whitespace from marked v18 is volatile — we only
    // assert on the meaningful structure, not byte-for-byte output.
    expect(html).toMatch(/<h1[^>]*>Title<\/h1>/)
    expect(html).toMatch(/<strong>bold<\/strong>/)
    expect(html).toMatch(/<em>italic<\/em>/)
    expect(html).toMatch(/<ul>/)
    expect(html).toMatch(/<li>one<\/li>/)
  })

  it('markdownToHtml renders code blocks and links', () => {
    const html = markdownToHtml('Use `npm install` and visit [npm](https://npmjs.com).')
    expect(html).toMatch(/<code>npm install<\/code>/)
    expect(html).toMatch(/<a href="https:\/\/npmjs\.com">npm<\/a>/)
  })

  it('htmlToMarkdown returns empty string for empty input', () => {
    expect(htmlToMarkdown('')).toBe('')
    expect(htmlToMarkdown('   ')).toBe('')
  })

  it('htmlToMarkdown turns headings into ATX markdown', () => {
    const md = htmlToMarkdown('<h2>Section</h2><p>body</p>')
    expect(md).toMatch(/^## Section/m)
    expect(md).toMatch(/body/)
  })

  it('htmlToMarkdown turns lists and links', () => {
    const md = htmlToMarkdown(
      '<ul><li>a</li><li>b</li></ul><p><a href="https://x.test">link</a></p>',
    )
    expect(md).toMatch(/-\s+a/)
    expect(md).toMatch(/-\s+b/)
    expect(md).toMatch(/\[link\]\(https:\/\/x\.test\)/)
  })

  it('round-trip: md -> html -> md preserves essential structure', () => {
    const original = `# Title

body **bold** paragraph

- one
- two
`
    const html = markdownToHtml(original)
    const back = htmlToMarkdown(html)
    // The converters are lossy but the structural tokens survive.
    expect(back).toMatch(/^# Title/m)
    expect(back).toMatch(/\*\*bold\*\*/)
    // turndown emits "-   one" (with extra spaces) — match the word.
    expect(back).toMatch(/-\s+one/)
    expect(back).toMatch(/-\s+two/)
  })

  it('round-tripped HTML still passes the sanitizer', () => {
    // The user can paste arbitrary HTML from the web into the editor;
    // the resulting HTML — even after a markdown round-trip — must
    // remain safe to inject into the preview pane.
    const dirty = `<p>hi <script>alert(1)</script></p>`
    const safe = sanitizeHtml(dirty)
    const md = htmlToMarkdown(safe)
    const html = markdownToHtml(md)
    // No <script> tag should reappear.
    expect(html).not.toMatch(/<script/i)
  })
})
