import { toPng, toSvg } from 'html-to-image'

const FLOW_SELECTOR = '.react-flow'

interface ViewportState {
  x: number
  y: number
  zoom: number
}

function getFitView(): (() => void) | undefined {
  const w = window as unknown as Record<string, unknown>
  return w.__mindmapFitView as (() => void) | undefined
}

function getViewport(): ViewportState | undefined {
  const w = window as unknown as Record<string, unknown>
  const fn = w.__mindmapGetViewport as (() => ViewportState) | undefined
  return fn?.()
}

function setViewport(vp: ViewportState) {
  const w = window as unknown as Record<string, unknown>
  const fn = w.__mindmapSetViewport as ((vp: ViewportState) => void) | undefined
  fn?.(vp)
}

async function prepareExport(): Promise<ViewportState | null> {
  const fitView = getFitView()
  if (!fitView) return null

  const prev = getViewport()
  fitView()
  await new Promise((r) => setTimeout(r, 100))
  return prev ?? null
}

function restoreViewport(vp: ViewportState | null) {
  if (vp) setViewport(vp)
}

export async function exportMindmapAsPng(
  options: { pixelRatio?: 1 | 2 | 3; filename?: string } = {},
): Promise<void> {
  const { pixelRatio = 2, filename = 'mindmap' } = options

  const prevViewport = await prepareExport()

  try {
    const el = document.querySelector(FLOW_SELECTOR) as HTMLElement | null
    if (!el) throw new Error('未找到脑图画布元素')

    const bg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim()

    const dataUrl = await toPng(el, {
      pixelRatio,
      backgroundColor: bg || '#ffffff',
    })

    const date = new Date().toISOString().slice(0, 10)
    downloadDataUrl(dataUrl, `${filename}_${date}.png`)
  } finally {
    restoreViewport(prevViewport)
  }
}

export async function exportMindmapAsSvg(filename = 'mindmap'): Promise<void> {
  const prevViewport = await prepareExport()

  try {
    const el = document.querySelector(FLOW_SELECTOR) as HTMLElement | null
    if (!el) throw new Error('未找到脑图画布元素')

    const dataUrl = await toSvg(el)

    const date = new Date().toISOString().slice(0, 10)
    downloadDataUrl(dataUrl, `${filename}_${date}.svg`)
  } finally {
    restoreViewport(prevViewport)
  }
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
