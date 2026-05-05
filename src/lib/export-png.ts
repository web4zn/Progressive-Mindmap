import { toPng } from 'dom-to-image-more'

export async function exportMindmapAsPng(
  options: { pixelRatio?: 1 | 2 | 3; filename?: string } = {},
): Promise<void> {
  const { pixelRatio = 2, filename = 'mindmap' } = options

  const el = document.querySelector('.react-flow') as HTMLElement | null
  if (!el) throw new Error('未找到脑图画布元素')

  const dataUrl = await toPng(el, {
    pixelRatio,
    backgroundColor: getComputedStyle(document.body).getPropertyValue('--background').trim() || '#ffffff',
  })

  const date = new Date().toISOString().slice(0, 10)
  downloadDataUrl(dataUrl, `${filename}_${date}.png`)
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
