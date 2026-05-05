import { toPng, toSvg } from 'html-to-image'
import { getNodesBounds, getViewportForBounds } from '@xyflow/react'

const FLOW_SELECTOR = '.react-flow__viewport'
const IMAGE_WIDTH = 1920
const IMAGE_HEIGHT = 1080

function getNodes(): { position: { x: number; y: number }; measured?: { width?: number; height?: number } }[] {
  const w = window as unknown as Record<string, unknown>
  const fn = w.__mindmapGetNodes as (() => { position: { x: number; y: number }; measured?: { width?: number; height?: number } }[]) | undefined
  return fn?.() ?? []
}

async function getExportStyle(): Promise<Record<string, string>> {
  const nodes = getNodes()
  if (nodes.length === 0) return {}

  const bounds = getNodesBounds(nodes as never)
  const viewport = getViewportForBounds(bounds, IMAGE_WIDTH, IMAGE_HEIGHT, 0.5, 2, 0.3)

  return {
    width: `${IMAGE_WIDTH}px`,
    height: `${IMAGE_HEIGHT}px`,
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
  }
}

export async function exportMindmapAsPng(
  options: { pixelRatio?: 1 | 2 | 3; filename?: string } = {},
): Promise<void> {
  const { pixelRatio = 2, filename = 'mindmap' } = options

  const el = document.querySelector(FLOW_SELECTOR) as HTMLElement | null
  if (!el) throw new Error('未找到脑图画布元素')

  const bg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim() || '#ffffff'
  const style = await getExportStyle()

  const dataUrl = await toPng(el, {
    pixelRatio,
    backgroundColor: bg,
    style,
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  })

  const date = new Date().toISOString().slice(0, 10)
  downloadDataUrl(dataUrl, `${filename}_${date}.png`)
}

export async function exportMindmapAsSvg(filename = 'mindmap'): Promise<void> {
  const el = document.querySelector(FLOW_SELECTOR) as HTMLElement | null
  if (!el) throw new Error('未找到脑图画布元素')

  const style = await getExportStyle()

  const dataUrl = await toSvg(el, {
    style,
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
  })

  const date = new Date().toISOString().slice(0, 10)
  downloadDataUrl(dataUrl, `${filename}_${date}.svg`)
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
