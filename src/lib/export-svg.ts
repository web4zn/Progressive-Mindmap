import { toSvg } from 'html-to-image'

export async function exportMindmapAsSvg(filename = 'mindmap'): Promise<void> {
  const el = document.querySelector('.react-flow__viewport') as HTMLElement | null
  if (!el) throw new Error('未找到脑图画布元素')

  const dataUrl = await toSvg(el, {
    backgroundColor: getComputedStyle(document.body).getPropertyValue('--background').trim() || '#ffffff',
  })

  const date = new Date().toISOString().slice(0, 10)
  downloadDataUrl(dataUrl, `${filename}_${date}.svg`)
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
