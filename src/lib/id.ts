export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 50)
}

export function deriveNodeId(label: string, parentPath: string[] = []): string {
  const seed = [...parentPath, normalizeLabel(label)].join('/')
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i) | 0
  }
  return 'n' + Math.abs(hash).toString(36).slice(0, 7)
}
