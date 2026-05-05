import { toSvg } from 'html-to-image'

export async function exportMindmapAsPng(
  options: { pixelRatio?: 1 | 2 | 3; filename?: string } = {},
): Promise<void> {
  const { pixelRatio = 2, filename = 'mindmap' } = options

  const el = document.querySelector('.react-flow') as HTMLElement | null
  if (!el) throw new Error('未找到脑图画布元素')

  const svgDataUrl = await toSvg(el, {
    backgroundColor: getComputedStyle(document.body).getPropertyValue('--background').trim() || '#ffffff',
  })

  const img = await loadImage(svgDataUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth * pixelRatio
  canvas.height = img.naturalHeight * pixelRatio
  const ctx = canvas.getContext('2d')!
  ctx.scale(pixelRatio, pixelRatio)
  ctx.drawImage(img, 0, 0)

  const date = new Date().toISOString().slice(0, 10)
  const dataUrl = canvas.toDataURL('image/png')
  downloadDataUrl(dataUrl, `${filename}_${date}.png`)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
