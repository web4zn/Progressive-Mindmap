declare module 'dom-to-image-more' {
  export function toPng(
    node: HTMLElement,
    options?: {
      quality?: number
      pixelRatio?: number
      backgroundColor?: string
      filter?: (node: Node) => boolean
    },
  ): Promise<string>

  export function toSvg(
    node: HTMLElement,
    options?: {
      backgroundColor?: string
      filter?: (node: Node) => boolean
    },
  ): Promise<string>
}
