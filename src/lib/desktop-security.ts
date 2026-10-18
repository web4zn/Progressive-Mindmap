/**
 * Renderer security policy — pure helpers shared by the Electron main process
 * and the build config (so dev/prod policies cannot drift).
 *
 * Kept free of `electron` imports so it can be unit-tested under happy-dom and
 * bundled into the main process.
 */

/**
 * Content-Security-Policy for the renderer.
 *
 * - `script-src 'self'`: the bundle is served from the app; no eval/inline in
 *   production. Dev additionally allows inline scripts because Vite injects the
 *   React-refresh preamble.
 * - `style-src 'unsafe-inline'`: React Flow / Tailwind set element style
 *   attributes at runtime.
 * - `connect-src https: http:`: the app talks to user-configured
 *   OpenAI-compatible endpoints (including localhost over http). This is the one
 *   deliberately broad directive; everything else is locked to `'self'`.
 * - `object-src`/`base-uri`/`form-action`/`frame-ancestors` are disabled.
 */
export function buildContentSecurityPolicy(isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    isDev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    isDev
      ? "connect-src 'self' https: http: ws: wss:"
      : "connect-src 'self' https: http:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ]
  return directives.join('; ')
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

/** True when `candidate` and `base` share an origin (protocol + host + port). */
export function isSameOrigin(candidate: string, base: string): boolean {
  const a = parseUrl(candidate)
  const b = parseUrl(base)
  if (!a || !b) return false
  return a.origin === b.origin
}

/** Only http(s) URLs may be handed to the OS browser. */
export function isHttpUrl(value: string): boolean {
  const url = parseUrl(value)
  return url !== null && (url.protocol === 'http:' || url.protocol === 'https:')
}

export function isFileUrl(value: string): boolean {
  return parseUrl(value)?.protocol === 'file:'
}

/**
 * May the renderer navigate to `target`?
 *
 * In development only the Vite dev server origin is allowed (HMR reloads). In
 * production the app is a `file://` document, so any non-file navigation is
 * blocked and external links are opened in the system browser instead.
 */
export function isAllowedAppNavigation(
  target: string,
  options: { isDev: boolean; devServerUrl: string },
): boolean {
  if (options.isDev) return isSameOrigin(target, options.devServerUrl)
  return isFileUrl(target)
}

/**
 * Permission requests are denied by default. The only permission the renderer
 * actually needs is writing to the clipboard (the "copy message" button);
 * clipboard *reads*, media, geolocation, notifications etc. stay denied.
 */
export function shouldAllowPermission(permission: string): boolean {
  return permission === 'clipboard-sanitized-write'
}
