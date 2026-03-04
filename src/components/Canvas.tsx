import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { Type, Image } from 'lucide-react'
import { useCanvasStore } from '../stores/canvasStore'
import type { Box, TextBoxData, ImageBoxData } from '../stores/canvasStore'
import { useLayoutStore } from '../stores/layoutStore'
import { Minimap } from './Minimap'
import { TextBox } from './TextBox'
import { ImageBox } from './ImageBox'

interface Position {
  x: number
  y: number
}

// Individual box component for rendering non-text boxes
function CanvasBox({ box, isSelected, onSelect, onDragStart }: {
  box: Box
  isSelected: boolean
  onSelect: () => void
  onDragStart: (e: React.MouseEvent, box: Box) => void
}) {
  const getBoxColor = (type: Box['type']) => {
    switch (type) {
      case 'text': return 'border-blue-500 bg-blue-500/10'
      case 'image': return 'border-green-500 bg-green-500/10'
      case 'web': return 'border-purple-500 bg-purple-500/10'
      case 'ai': return 'border-yellow-500 bg-yellow-500/10'
      case 'youtube': return 'border-red-500 bg-red-500/10'
      default: return 'border-neutral-500 bg-neutral-500/10'
    }
  }

  return (
    <div
      className={`
        absolute rounded-lg border-2 cursor-move
        transition-shadow duration-150
        ${getBoxColor(box.type)}
        ${isSelected ? 'ring-2 ring-white/50 shadow-lg' : 'hover:shadow-md'}
      `}
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        zIndex: box.zIndex,
      }}
      onMouseDown={(e) => {
        e.stopPropagation()
        onSelect()
        onDragStart(e, box)
      }}
    >
      <div className="p-2 text-xs text-neutral-400 capitalize">
        {box.type}
      </div>
      {box.content && (
        <div className="px-2 text-sm text-neutral-300 truncate">
          {box.content}
        </div>
      )}
    </div>
  )
}

export function Canvas() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Canvas store
  const {
    viewport,
    setViewport,
    zoomTo,
    panBy,
    grid,
    boxes,
    getVisibleBoxes,
    selectedBoxId,
    selectBox,
    moveBox,
    resizeBox,
    removeBox,
    addTextBox,
    addImageBox,
    updateTextContent,
    updateImageContent,
    toggleBoxLock,
    bringToFront,
    sendToBack,
    duplicateBox,
    editingBoxId,
    startEditing,
    stopEditing,
  } = useCanvasStore()
  
  // Sync with layout store for backward compatibility
  const { setZoom: setLayoutZoom, gridVisible } = useLayoutStore()
  
  // Pan state
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 })
  
  // Box dragging state
  const [isDraggingBox, setIsDraggingBox] = useState(false)
  const [draggedBox, setDraggedBox] = useState<Box | null>(null)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })
  
  // Double-click detection
  const [lastClickTime, setLastClickTime] = useState(0)
  const [lastClickPos, setLastClickPos] = useState<Position>({ x: 0, y: 0 })
  
  // Viewport dimensions
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  
  // Canvas drag & drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  
  // Track viewport size
  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        setViewportSize({
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight
        })
      }
    }
    
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])
  
  // Sync zoom with layout store
  useEffect(() => {
    setLayoutZoom(viewport.zoom)
  }, [viewport.zoom, setLayoutZoom])

  // Virtualized visible boxes
  const visibleBoxes = useMemo(() => {
    return getVisibleBoxes(viewportSize.width, viewportSize.height, 300)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getVisibleBoxes, viewportSize, boxes.length, viewport.x, viewport.y, viewport.zoom])

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number): Position => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    
    const scale = viewport.zoom / 100
    return {
      x: (screenX - rect.left - viewport.x) / scale,
      y: (screenY - rect.top - viewport.y) / scale,
    }
  }, [viewport])

  // Handle mouse wheel for zoom and pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom towards cursor
      const rect = canvasRef.current?.getBoundingClientRect()
      if (rect) {
        const cursorX = e.clientX - rect.left
        const cursorY = e.clientY - rect.top
        const delta = e.deltaY > 0 ? -10 : 10
        zoomTo(viewport.zoom + delta, cursorX, cursorY)
      }
    } else {
      // Pan with scroll
      panBy(-e.deltaX, -e.deltaY)
    }
  }, [viewport.zoom, zoomTo, panBy])

  // Start panning
  const startPan = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    setIsPanning(true)
    // Account for canvas position on page
    setPanStart({ 
      x: e.clientX - rect.left - viewport.x, 
      y: e.clientY - rect.top - viewport.y 
    })
  }, [viewport.x, viewport.y])

  // Context menu state for double-click
  const [showBoxMenu, setShowBoxMenu] = useState(false)
  const [boxMenuPos, setBoxMenuPos] = useState<Position>({ x: 0, y: 0 })

  // Handle double-click on canvas to create box with menu
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    // Only handle double-click on empty canvas area
    if (e.target !== contentRef.current && e.target !== canvasRef.current) {
      return
    }
    
    // Show box type selection menu
    setBoxMenuPos({ x: e.clientX, y: e.clientY })
    setShowBoxMenu(true)
  }, [])

  // Handle box menu selection
  const handleBoxMenuSelect = useCallback((type: 'text' | 'image') => {
    const canvasPos = screenToCanvas(boxMenuPos.x, boxMenuPos.y)
    if (type === 'text') {
      addTextBox(canvasPos.x - 150, canvasPos.y - 100)
    } else if (type === 'image') {
      addImageBox(canvasPos.x - 200, canvasPos.y - 150)
    }
    setShowBoxMenu(false)
  }, [boxMenuPos, screenToCanvas, addTextBox, addImageBox])

  // Close box menu
  const closeBoxMenu = useCallback(() => {
    setShowBoxMenu(false)
  }, [])

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const now = Date.now()
    const pos = { x: e.clientX, y: e.clientY }
    
    // Check for double-click (within 300ms and 10px)
    if (
      now - lastClickTime < 300 &&
      Math.abs(pos.x - lastClickPos.x) < 10 &&
      Math.abs(pos.y - lastClickPos.y) < 10
    ) {
      handleDoubleClick(e)
      setLastClickTime(0) // Reset to prevent triple-click detection
      return
    }
    
    setLastClickTime(now)
    setLastClickPos(pos)
    
    // Middle mouse button always pans
    if (e.button === 1) {
      e.preventDefault()
      startPan(e)
      return
    }
    
    // Left click on empty canvas - pan with Space or just pan
    if (e.button === 0) {
      // Check if clicking on empty canvas (not on a box)
      if (e.target === contentRef.current || e.target === canvasRef.current) {
        selectBox(null) // Deselect any selected box
        stopEditing() // Stop editing if active
        startPan(e)
      }
    }
  }, [lastClickTime, lastClickPos, handleDoubleClick, startPan, selectBox, stopEditing])

  // Handle mouse move (document-level for robust dragging)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      setViewport({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    } else if (isDraggingBox && draggedBox) {
      // Move dragged box
      const scale = viewport.zoom / 100
      const newX = (e.clientX - dragOffset.x - viewport.x) / scale
      const newY = (e.clientY - dragOffset.y - viewport.y) / scale
      moveBox(draggedBox.id, newX, newY)
    }
  }, [isPanning, panStart, setViewport, isDraggingBox, draggedBox, dragOffset, viewport, moveBox])

  // Handle mouse up (document-level for robust dragging)
  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setIsDraggingBox(false)
    setDraggedBox(null)
  }, [])

  // Add document-level event listeners when dragging/panning starts
  useEffect(() => {
    if (isPanning || isDraggingBox) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isPanning, isDraggingBox, handleMouseMove, handleMouseUp])

  // Start dragging a box
  const handleBoxDragStart = useCallback((e: React.MouseEvent, box: Box) => {
    if (box.locked) return
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const scale = viewport.zoom / 100
    setIsDraggingBox(true)
    setDraggedBox(box)
    // Account for canvas position on page
    setDragOffset({
      x: e.clientX - rect.left - viewport.x - box.x * scale,
      y: e.clientY - rect.top - viewport.y - box.y * scale
    })
  }, [viewport])

  // Calculate scaled grid size
  const scaledGridSize = grid.size * (viewport.zoom / 100)

  // Cursor style
  const getCursor = () => {
    if (isPanning) return 'grabbing'
    if (isDraggingBox) return 'move'
    return 'default'
  }

  // Render a box based on its type
  const renderBox = (box: Box) => {
    // Offset to account for canvas positioning
    const displayBox = {
      ...box,
      x: box.x + 5000,
      y: box.y + 5000,
    }

    if (box.type === 'text') {
      return (
        <TextBox
          key={box.id}
          box={displayBox as TextBoxData}
          isSelected={selectedBoxId === box.id}
          isEditing={editingBoxId === box.id}
          onSelect={() => selectBox(box.id)}
          onStartEdit={() => startEditing(box.id)}
          onEndEdit={() => stopEditing()}
          onDragStart={(e) => handleBoxDragStart(e, box)}
          onContentChange={(content) => updateTextContent(box.id, content)}
          onResize={(width, height) => resizeBox(box.id, width, height)}
          onDelete={() => removeBox(box.id)}
          onDuplicate={() => duplicateBox(box.id)}
          onBringToFront={() => bringToFront(box.id)}
          onSendToBack={() => sendToBack(box.id)}
          onToggleLock={() => toggleBoxLock(box.id)}
        />
      )
    }

    if (box.type === 'image') {
      return (
        <ImageBox
          key={box.id}
          box={displayBox as ImageBoxData}
          isSelected={selectedBoxId === box.id}
          onSelect={() => selectBox(box.id)}
          onDragStart={(e) => handleBoxDragStart(e, box)}
          onResize={(width, height) => resizeBox(box.id, width, height)}
          onDelete={() => removeBox(box.id)}
          onDuplicate={() => duplicateBox(box.id)}
          onBringToFront={() => bringToFront(box.id)}
          onSendToBack={() => sendToBack(box.id)}
          onToggleLock={() => toggleBoxLock(box.id)}
          onImageUrlChange={(imageUrl, altText) => updateImageContent(box.id, imageUrl, altText)}
        />
      )
    }

    return (
      <CanvasBox
        key={box.id}
        box={displayBox}
        isSelected={selectedBoxId === box.id}
        onSelect={() => selectBox(box.id)}
        onDragStart={(e) => handleBoxDragStart(e, box)}
      />
    )
  }

  return (
    <div
      ref={canvasRef}
      className={`flex-1 relative overflow-hidden select-none ${isDraggingOver ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
      style={{
        backgroundColor: '#1a1a1a',
        cursor: getCursor(),
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={(e) => {
        e.preventDefault()
        if (e.dataTransfer.types.includes('Files')) {
          setIsDraggingOver(true)
        }
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDraggingOver(false)
        
        const files = e.dataTransfer.files
        if (files.length > 0) {
          const file = files[0]
          const supportedFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']
          if (supportedFormats.includes(file.type)) {
            const reader = new FileReader()
            reader.onload = (event) => {
              const result = event.target?.result as string
              const canvasPos = screenToCanvas(e.clientX, e.clientY)
              addImageBox(canvasPos.x - 200, canvasPos.y - 150, result, 400, 300, file.name.replace(/\.[^/.]+$/, ''))
            }
            reader.readAsDataURL(file)
          }
        }
      }}
    >
      {/* Grid Pattern */}
      {(gridVisible || grid.visible) && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            transform: `translate(${viewport.x % scaledGridSize}px, ${viewport.y % scaledGridSize}px)`,
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
                r={Math.max(0.5, viewport.zoom / 100)}
                fill="rgba(255, 255, 255, 0.08)"
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
                r={Math.max(1, viewport.zoom / 80)}
                fill="rgba(255, 255, 255, 0.15)"
              />
            </pattern>
          </defs>
          <rect
            x={-scaledGridSize * 2}
            y={-scaledGridSize * 2}
            width="200%"
            height="200%"
            fill="url(#grid-large)"
          />
        </svg>
      )}

      {/* Canvas content container */}
      <div
        ref={contentRef}
        className="absolute origin-top-left"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom / 100})`,
          // Use a large canvas size for infinite feel
          width: '10000px',
          height: '10000px',
          left: '-5000px',
          top: '-5000px',
        }}
      >
        {/* Origin crosshair */}
        <div 
          className="absolute pointer-events-none"
          style={{ left: '5000px', top: '5000px' }}
        >
          <div className="absolute w-px h-8 bg-neutral-600 -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute w-8 h-px bg-neutral-600 -translate-x-1/2 -translate-y-1/2" />
        </div>

        {/* Render only visible boxes (virtualization) */}
        {visibleBoxes.length > 0 ? (
          visibleBoxes.map(renderBox)
        ) : (
          /* Empty state indicator */
          <div 
            className="absolute text-center pointer-events-none"
            style={{ left: '5000px', top: '5000px', transform: 'translate(-50%, -50%)' }}
          >
            <div className="text-neutral-600 text-sm">
              <p className="mb-2">Double-click to create a box (Text or Image)</p>
              <p className="text-xs text-neutral-700">
                T - Text • I - Image • Drag to pan • Ctrl+Scroll to zoom
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Box type selection menu (on double-click) */}
      {showBoxMenu && (
        <div
          className="fixed z-50 min-w-36 py-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl"
          style={{ top: boxMenuPos.y, left: boxMenuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleBoxMenuSelect('text')}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 text-sm text-neutral-200"
          >
            <Type size={14} className="text-blue-400" />
            Text
          </button>
          <button
            onClick={() => handleBoxMenuSelect('image')}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 text-sm text-neutral-200"
          >
            <Image size={14} className="text-green-400" />
            Image
          </button>
        </div>
      )}

      {/* Click outside to close box menu */}
      {showBoxMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeBoxMenu}
          onContextMenu={(e) => { e.preventDefault(); closeBoxMenu() }}
        />
      )}

      {/* Minimap */}
      <Minimap />

      {/* Zoom indicator */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-neutral-800/80 backdrop-blur-sm rounded-full text-sm text-neutral-300 pointer-events-none">
        {viewport.zoom}%
      </div>

      {/* Snap-to-grid indicator */}
      {grid.snapToGrid && (
        <div className="absolute top-4 right-4 px-2 py-1 bg-blue-500/20 border border-blue-500/40 rounded text-xs text-blue-400">
          Snap: {grid.size}px
        </div>
      )}

      {/* Keyboard shortcuts help */}
      <div className="absolute bottom-4 left-4 text-xs text-neutral-600 space-y-0.5">
        <div>T - New text box</div>
        <div>I - New image box</div>
        <div>⌘D - Duplicate</div>
        <div>Del - Delete</div>
        <div>Enter - Edit selected</div>
        <div>Drop image - Add image</div>
      </div>
    </div>
  )
}
