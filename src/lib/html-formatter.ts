import { html_beautify } from 'js-beautify'

export function formatHtml(html: string): string {
  return html_beautify(html, {
    indent_size: 2,
    indent_char: ' ',
    wrap_line_length: 80,
    preserve_newlines: true,
    max_preserve_newlines: 2,
  })
}
