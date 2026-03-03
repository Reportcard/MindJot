import { useRef, useState, useCallback, useEffect } from 'react'
import { useLayoutStore } from '../stores/layoutStore'

interface Position {
  x: number
  y: number
}

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const { zoom, setZoom, gridVisible } = useLayoutStore()
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState<Position>({ x: 0, y: 0 })
  const [startPan, setStartPan] = useState<Position>({ x: 0, y: 0 })
  
  // Grid size (in pixels)
  const gridSize = 20

  // Handle mouse wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -10 : 10
      setZoom(zoom + delta)
    } else {
      // Pan with scroll
      setPanOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }))
    }
  }, [zoom, setZoom])

  // Handle middle mouse button pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault()
      setIsPanning(true)
      setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
    }
  }, [panOffset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      })
    }
  }, [isPanning, startPan])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Reset view with Ctrl+0
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        setZoom(100)
        setPanOffset({ x: 0, y: 0 })
      }
      // Zoom in with Ctrl++
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        setZoom(zoom + 10)
      }
      // Zoom out with Ctrl+-
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        setZoom(zoom - 10)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zoom, setZoom])

  // Calculate scaled grid size
  const scaledGridSize = gridSize * (zoom / 100)

  return (
    <div
      ref={canvasRef}
      className={`
        flex-1 relative overflow-hidden
        ${isPanning ? 'cursor-grabbing' : 'cursor-default'}
      `}
      style={{
        backgroundColor: '#1a1a1a',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Grid Pattern */}
      {gridVisible && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            transform: `translate(${panOffset.x % scaledGridSize}px, ${panOffset.y % scaledGridSize}px)`,
          }}
        >
          <defs>
            <pattern
              id="grid-small"
              width={scaledGridSize}
              height={scaledGridSize}
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx={scaledGridSize / 2}
                cy={scaledGridSize / 2}
                r={1}
                fill="rgba(255, 255, 255, 0.1)"
              />
            </pattern>
            <pattern
              id="grid-large"
              width={scaledGridSize * 5}
              height={scaledGridSize * 5}
              patternUnits="userSpaceOnUse"
            >
              <rect
                width={scaledGridSize * 5}
                height={scaledGridSize * 5}
                fill="url(#grid-small)"
              />
              <circle
                cx={scaledGridSize * 5 / 2}
                cy={scaledGridSize * 5 / 2}
                r={1.5}
                fill="rgba(255, 255, 255, 0.2)"
              />
            </pattern>
          </defs>
          <rect
            x={-scaledGridSize}
            y={-scaledGridSize}
            width="calc(100% + 200px)"
            height="calc(100% + 200px)"
            fill="url(#grid-large)"
          />
        </svg>
      )}

      {/* Canvas content container */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom / 100})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Boxes will be rendered here */}
        {/* Center indicator for empty state */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className="text-neutral-600 text-sm">
            <p className="mb-2">Click a tool in the toolbar to add content</p>
            <p className="text-xs text-neutral-700">
              Scroll to pan • Ctrl+Scroll to zoom • Shift+Drag to pan
            </p>
          </div>
        </div>
      </div>

      {/* Zoom indicator (shows briefly when zooming) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-neutral-800/90 rounded-full text-sm text-neutral-300 opacity-0 transition-opacity pointer-events-none">
        {zoom}%
      </div>
    </div>
  )
}
