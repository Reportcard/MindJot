import { useRef, useCallback, useState, useMemo } from 'react'
import { useCanvasStore } from '../stores/canvasStore'

const MINIMAP_WIDTH = 160
const MINIMAP_HEIGHT = 100
const MINIMAP_SCALE = 0.02 // Scale factor for world-to-minimap

export function Minimap() {
  const minimapRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  const { viewport, setViewport, boxes } = useCanvasStore()
  
  // Calculate viewport rectangle in minimap coordinates
  const viewportRect = useMemo(() => {
    const scale = viewport.zoom / 100
    // Assuming a viewport of ~1200x800 for calculation
    const viewportWidth = 1200 / scale
    const viewportHeight = 800 / scale
    
    return {
      x: (-viewport.x / scale) * MINIMAP_SCALE + MINIMAP_WIDTH / 2,
      y: (-viewport.y / scale) * MINIMAP_SCALE + MINIMAP_HEIGHT / 2,
      width: viewportWidth * MINIMAP_SCALE,
      height: viewportHeight * MINIMAP_SCALE,
    }
  }, [viewport])
  
  // Calculate bounds of all boxes for minimap (used for auto-fit feature)
  const _boxBounds = useMemo(() => {
    if (boxes.length === 0) {
      return { minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 }
    }
    
    const minX = Math.min(...boxes.map(b => b.x))
    const minY = Math.min(...boxes.map(b => b.y))
    const maxX = Math.max(...boxes.map(b => b.x + b.width))
    const maxY = Math.max(...boxes.map(b => b.y + b.height))
    
    // Add padding
    const padding = 500
    return {
      minX: Math.min(minX - padding, -1000),
      minY: Math.min(minY - padding, -1000),
      maxX: Math.max(maxX + padding, 1000),
      maxY: Math.max(maxY + padding, 1000),
    }
  }, [boxes])
  
  // Suppress unused warning - will be used for auto-fit feature
  void _boxBounds
  
  // Navigate to clicked position
  const navigateTo = useCallback((e: React.MouseEvent) => {
    const rect = minimapRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top
    
    // Convert minimap coordinates to world coordinates
    const worldX = (clickX - MINIMAP_WIDTH / 2) / MINIMAP_SCALE
    const worldY = (clickY - MINIMAP_HEIGHT / 2) / MINIMAP_SCALE
    
    // Center viewport on clicked position
    const scale = viewport.zoom / 100
    setViewport({
      x: -worldX * scale,
      y: -worldY * scale,
    })
  }, [viewport.zoom, setViewport])
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    navigateTo(e)
  }, [navigateTo])
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      navigateTo(e)
    }
  }, [isDragging, navigateTo])
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  // Get box color for minimap
  const getBoxColor = (type: string) => {
    switch (type) {
      case 'text': return '#3b82f6'
      case 'image': return '#22c55e'
      case 'web': return '#a855f7'
      case 'ai': return '#eab308'
      case 'youtube': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return (
    <div
      ref={minimapRef}
      className={`
        absolute bottom-4 right-4 rounded-lg overflow-hidden
        border border-neutral-700 bg-neutral-900/90 backdrop-blur-sm
        cursor-crosshair transition-opacity duration-200
        ${isHovered || isDragging ? 'opacity-100' : 'opacity-60'}
      `}
      style={{
        width: MINIMAP_WIDTH,
        height: MINIMAP_HEIGHT,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false)
        setIsHovered(false)
      }}
      onMouseEnter={() => setIsHovered(true)}
    >
      {/* Origin crosshair */}
      <div 
        className="absolute bg-neutral-600"
        style={{
          left: MINIMAP_WIDTH / 2 - 0.5,
          top: 0,
          width: 1,
          height: MINIMAP_HEIGHT,
        }}
      />
      <div 
        className="absolute bg-neutral-600"
        style={{
          left: 0,
          top: MINIMAP_HEIGHT / 2 - 0.5,
          width: MINIMAP_WIDTH,
          height: 1,
        }}
      />
      
      {/* Boxes preview */}
      {boxes.map((box) => (
        <div
          key={box.id}
          className="absolute rounded-sm"
          style={{
            left: box.x * MINIMAP_SCALE + MINIMAP_WIDTH / 2,
            top: box.y * MINIMAP_SCALE + MINIMAP_HEIGHT / 2,
            width: Math.max(2, box.width * MINIMAP_SCALE),
            height: Math.max(2, box.height * MINIMAP_SCALE),
            backgroundColor: getBoxColor(box.type),
            opacity: 0.7,
          }}
        />
      ))}
      
      {/* Viewport indicator */}
      <div
        className="absolute border-2 border-white/50 bg-white/10 rounded-sm"
        style={{
          left: Math.max(0, Math.min(MINIMAP_WIDTH - 10, viewportRect.x - viewportRect.width / 2)),
          top: Math.max(0, Math.min(MINIMAP_HEIGHT - 10, viewportRect.y - viewportRect.height / 2)),
          width: Math.max(10, Math.min(viewportRect.width, MINIMAP_WIDTH)),
          height: Math.max(8, Math.min(viewportRect.height, MINIMAP_HEIGHT)),
        }}
      />
      
      {/* Label */}
      <div className="absolute bottom-1 left-1 text-[8px] text-neutral-500 pointer-events-none">
        minimap
      </div>
    </div>
  )
}
