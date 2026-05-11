import DOMPurify from 'dompurify'

/** DOMPurify 配置：白名单标签和属性，与 system-prompt 中的允许列表一致 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
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
    'br',
    'hr',
    'span',
    'div',
  ],
  ALLOWED_ATTR: ['href', 'title', 'class'],
}

/**
 * 清洗 HTML 内容，移除所有禁止的标签和属性。
 * 用于在 dangerouslySetInnerHTML 之前确保 XSS 安全。
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, SANITIZE_CONFIG)
}
