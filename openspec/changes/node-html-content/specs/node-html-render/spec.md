## ADDED Requirements

### Requirement: HTML content is sanitized before rendering

The system SHALL sanitize all HTML content from LLM output using DOMPurify before rendering to the DOM.

- Sanitization SHALL strip all disallowed tags and attributes
- Only whitelisted HTML tags SHALL survive sanitization
- Event handlers (onclick, onerror, etc.) SHALL be removed

#### Scenario: Safe HTML renders correctly
- **WHEN** a node has `contentType: 'html'` and content `<h3>标题</h3><p>一段文字</p>`
- **THEN** the system SHALL render a heading and paragraph inside the node

#### Scenario: Script injection is blocked
- **WHEN** a node's content contains `<script>alert('xss')</script>`
- **THEN** DOMPurify SHALL strip the `<script>` tag
- **THEN** no script SHALL execute in the browser

#### Scenario: Event handlers are stripped
- **WHEN** content contains `<div onclick="alert(1)">text</div>`
- **THEN** the `onclick` attribute SHALL be removed
- **THEN** the `<div>` tag SHALL remain (with no onclick)

### Requirement: HTML whitelist is enforced

The system SHALL only allow a defined set of HTML tags and attributes.

Allowed tags: `h2, h3, h4, p, ul, ol, li, code, pre, strong, em, a, blockquote, table, thead, tbody, tr, th, td, br, hr, span, div`

Allowed attributes: `href` (on `<a>` only), `title`, `class`

#### Scenario: Allowed table renders
- **WHEN** content contains `<table><tr><td>data</td></tr></table>`
- **THEN** the table SHALL render correctly

#### Scenario: Disallowed tag is removed
- **WHEN** content contains `<iframe src="evil.com"></iframe>`
- **THEN** the iframe tag SHALL be removed
- **THEN** the iframe content SHALL NOT load

### Requirement: Node displays HTML content on canvas

The FlowNode component SHALL render `contentType: 'html'` nodes using sanitized HTML instead of markdown.

#### Scenario: HTML node shows rich content
- **WHEN** a FlowNode receives data with `contentType: 'html'`
- **THEN** the node SHALL display the sanitized HTML
- **THEN** the node SHALL NOT show the raw HTML source
