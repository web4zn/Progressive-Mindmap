import DOMPurify from 'dompurify'

/** DOMPurify 配置：白名单标签和属性，与 system-prompt 中的允许列表一致 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    // Stage B added 'h1' so the new H1 toolbar button survives the
    // sanitizer round-trip when the user toggles contentType.
    'h1',
    'h2',
    'h3',
    'h4',
    'p',
    'ul',
    'ol',
    'li',
    'code',
    'pre',
    'strong',
    'em',
    'a',
    'blockquote',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'img',
    'br',
    'hr',
    'span',
    'div',
  ],
  ALLOWED_ATTR: ['href', 'title', 'class', 'src', 'alt', 'target', 'rel'],
  // DOMPurify's default URI allowlist does not include `blob:`; node images
  // may legitimately use `data:`/`blob:` (we strip every other `src` in the
  // hook below). `javascript:` is still rejected by the regexp.
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data|blob):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
}

/**
 * Remote-resource isolation + link externalisation.
 *
 * - `img` must not load remote URLs: rendering a mindmap must not phone home
 *   (local-first privacy). Only `data:` / `blob:` sources survive.
 * - External `http(s)` links are opened by the system browser (`target=_blank`
 *   routes through Electron's window-open handler) instead of navigating the
 *   app window.
 */
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (!(node instanceof Element)) return
  const tag = node.tagName.toUpperCase()

  if (tag === 'IMG') {
    const src = node.getAttribute('src')
    if (src && !/^(data:|blob:)/i.test(src)) {
      node.removeAttribute('src')
    }
  }

  if (tag === 'A') {
    const href = node.getAttribute('href')
    if (href && /^(data:|blob:)/i.test(href)) {
      // Data URLs in links could navigate the app document to attacker HTML.
      node.removeAttribute('href')
    } else if (href && /^https?:\/\//i.test(href)) {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  }
})

/**
 * 清洗 HTML 内容，移除所有禁止的标签和属性。
 * 用于在 dangerouslySetInnerHTML 之前确保 XSS 安全。
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG)
}
