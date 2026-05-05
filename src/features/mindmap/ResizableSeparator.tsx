import { useCallback, useRef, useEffect, useState } from 'react'

interface ResizableSeparatorProps {
  onResize: (width: number) => void
  minWidth?: number
  maxWidth?: number
}

export default function ResizableSeparator({
  onResize,
  minWidth = 300,
  maxWidth = 800,
}: ResizableSeparatorProps) {
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    startXRef.current = e.clientX
  }, [])

  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startXRef.current - e.clientX
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidthRef.current + delta))
      startWidthRef.current = newWidth
      startXRef.current = e.clientX
      onResize(newWidth)
    }

    const handleMouseUp = () => {
      setDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, onResize, minWidth, maxWidth])

  return (
    <div
      className={`w-1.5 shrink-0 cursor-col-resize transition-colors duration-150 ${
        dragging ? 'bg-primary' : 'bg-border hover:bg-primary/50'
      }`}
      onMouseDown={handleMouseDown}
    />
  )
}
