/**
 * Provider endpoint helpers.
 *
 * Local OpenAI-compatible servers (Ollama, LM Studio, llama.cpp, …) do not use
 * an API key, but the OpenAI SDK rejects an empty `apiKey`. These pure helpers
 * centralise the rules so the settings form, the chat client and the agent
 * worker agree on them.
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'])

/** True when the endpoint points at a machine-local server. */
export function isLocalEndpoint(endpoint: string): boolean {
  const trimmed = endpoint.trim()
  if (!trimmed) return false
  try {
    const host = new URL(trimmed).hostname.toLowerCase()
    return LOCAL_HOSTNAMES.has(host) || host.endsWith('.localhost')
  } catch {
    return false
  }
}

/** Remote providers need a key; local servers are allowed to omit it. */
export function requiresApiKey(endpoint: string): boolean {
  return !isLocalEndpoint(endpoint)
}

/** Trim whitespace and any trailing slashes (`…/v1/` → `…/v1`). */
export function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, '')
}

/**
 * Resolve the key to hand to the OpenAI SDK. A local endpoint with no stored
 * key gets a placeholder so the SDK is satisfied; the placeholder is never
 * persisted (callers pass the stored value, not this result).
 */
export function resolveApiKey(endpoint: string, apiKey: string): string {
  const trimmed = apiKey.trim()
  if (trimmed) return trimmed
  return isLocalEndpoint(endpoint) ? 'sk-local' : ''
}
