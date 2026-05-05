import { toPng, toSvg } from 'html-to-image'

const FLOW_SELECTOR = '.react-flow'

export async function exportMindmapAsPng(
  options: { pixelRatio?: 1 | 2 | 3; filename?: string } = {},
): Promise<void> {
  const { pixelRatio = 2, filename = 'mindmap' } = options

  const el = document.querySelector(FLOW_SELECTOR) as HTMLElement | null
  if (!el) throw new Error('未找到脑图画布元素')

  const bg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim()

  const dataUrl = await toPng(el, {
    pixelRatio,
    backgroundColor: bg || '#ffffff',
  })

  const date = new Date().toISOString().slice(0, 10)
  downloadDataUrl(dataUrl, `${filename}_${date}.png`)
}

export async function exportMindmapAsSvg(filename = 'mindmap'): Promise<void> {
  const el = document.querySelector(FLOW_SELECTOR) as HTMLElement | null
  if (!el) throw new Error('未找到脑图画布元素')

  const dataUrl = await toSvg(el)

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
