import { marked } from 'marked'
import TurndownService from 'turndown'

/**
 * Stage B: HTML <-> Markdown conversion helpers used by the node
 * editor when the user toggles `contentType` between `'html'` and
 * `'markdown'`. The round-trip is lossy by nature (markdown can't
 * represent every HTML construct) so we keep the converters in one
 * place and never call them on user-supplied data without first
 * running the result through `sanitizeHtml`.
 */

// marked v18 ships ESM with a callable default export. We don't need
// extensions for the editor preview (no GFM tables would be lost; the
// node already renders tables from the HTML path) but we do need
// `gfm: true` so lists / links work the way users expect.
marked.setOptions({ gfm: true, breaks: false })

// Single shared Turndown instance — its config is deterministic and
// stateless aside from the heading style choice.
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
})

/**
 * Render Markdown to HTML. Empty / whitespace-only input returns the
 * empty string (so the editor preview can show its "no content"
 * placeholder). All output is plain HTML — the caller is responsible
 * for running it through `sanitizeHtml` before injecting into the
 * DOM.
 */
export function markdownToHtml(md: string): string {
  const trimmed = md.trim()
  if (!trimmed) return ''
  // marked.parse is sync when no async extensions are registered.
  return marked.parse(trimmed, { async: false }) as string
}

/**
 * Render HTML to Markdown. Empty input returns the empty string.
 * Turndown is given the raw HTML; if the caller knows the input has
 * already been through `sanitizeHtml` (which strips most of the tags
 * we don't support anyway) this is a no-op on the safe side.
 */
export function htmlToMarkdown(html: string): string {
  if (!html.trim()) return ''
  return turndown.turndown(html)
}
