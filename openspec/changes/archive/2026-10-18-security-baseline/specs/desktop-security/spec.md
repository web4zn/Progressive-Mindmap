## ADDED Requirements

### Requirement: Renderer content security policy

The Electron renderer SHALL be served with a Content-Security-Policy.

In production the policy SHALL lock scripts to `'self'`, allow inline styles
(React Flow and Tailwind set style attributes), and restrict `connect-src` to
`'self'` plus `https:`/`http:` so user-configured LLM endpoints keep working.
`object-src`, `base-uri`, `form-action` and `frame-ancestors` SHALL be disabled.
Development MAY additionally allow inline scripts and WebSockets for Vite HMR.

The policy SHALL be delivered both as a response header (session
`onHeadersReceived`) and, for the packaged renderer, as a `<meta
http-equiv="Content-Security-Policy">` injected at build time.

#### Scenario: Production policy blocks injected scripts

- **WHEN** the packaged renderer loads
- **THEN** its CSP contains `script-src 'self'` and does not allow `'unsafe-inline'` scripts
- **AND** `connect-src` still permits the configured provider endpoints

#### Scenario: Development policy keeps HMR working

- **WHEN** the app runs via `npm run dev`
- **THEN** the policy allows inline scripts and `ws:`/`wss:` connections
- **AND** production builds do not

### Requirement: Navigation and external link policy

The main process SHALL allow renderer navigation only to an allow-listed target:
the Vite dev-server origin in development, and `file:` URLs in production. All
other navigation SHALL be cancelled.

External URLs SHALL be opened with `shell.openExternal` only when their scheme
is `http:` or `https:`; every other scheme SHALL be ignored. The same rule SHALL
apply to `window.open` / new-window requests.

#### Scenario: Lookalike origin is blocked

- **WHEN** the renderer attempts to navigate to `http://localhost:5173.evil.com` while the dev server is `http://localhost:5173`
- **THEN** navigation is cancelled and the URL is not trusted as the app origin

#### Scenario: External http link opens in the system browser

- **WHEN** a user clicks an `https://…` link rendered inside node content
- **THEN** the app window does not navigate
- **AND** the URL is opened with the OS default browser

#### Scenario: Non-http schemes are not passed to the OS

- **WHEN** a link uses `file:`, `javascript:` or a custom scheme
- **THEN** it is not opened with `shell.openExternal`

### Requirement: Permission policy

The renderer session SHALL deny permission requests by default. The only
allow-listed permission SHALL be `clipboard-sanitized-write` (copying a message).
Clipboard reads, media capture, geolocation and notifications SHALL be denied.

#### Scenario: Clipboard write is allowed

- **WHEN** the renderer uses the clipboard write API
- **THEN** the permission is granted

#### Scenario: Sensitive permissions are denied

- **WHEN** the renderer requests media, geolocation or clipboard-read
- **THEN** the request is denied

### Requirement: Remote resource isolation in node HTML

Sanitized mindmap node content SHALL NOT reference remote resources. An `<img>`
whose `src` is not a `data:` or `blob:` URL SHALL have its `src` removed while
keeping the element (and its alt text). Links whose `href` is an `http:`/`https:`
URL SHALL be marked `target="_blank"` and `rel="noopener noreferrer"` so they
open externally instead of navigating the app.

#### Scenario: Remote image is stripped

- **WHEN** node HTML contains `<img src="https://tracker.example/pixel.png" alt="x">`
- **THEN** the sanitized output keeps the `img` and `alt` but has no `src`
- **AND** no network request is made when rendering the node

#### Scenario: Inline image is kept

- **WHEN** node HTML contains an image with a `data:` URL
- **THEN** the image and its `src` are preserved

#### Scenario: External link is externalised

- **WHEN** node HTML contains `<a href="https://example.com">link</a>`
- **THEN** the sanitized anchor has `target="_blank"` and `rel="noopener noreferrer"`
