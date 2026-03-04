import { useState, useRef, useEffect, useCallback, memo } from 'react'
import {
  Lock,
  Unlock,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  X,
} from 'lucide-react'
import type { ImageBoxData } from '../stores/canvasStore'

interface ImageBoxProps {
  box: ImageBoxData
  isSelected: boolean
  onSelect: () => void
  onDragStart: (e: React.MouseEvent) => void
  onResize: (width: number, height: number) => void
  onDelete: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  onToggleLock: () => void
  onImageUrlChange: (imageUrl: string, altText?: string) => void
}

// Resize handle positions
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const RESIZE_HANDLES: ResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

const getHandleStyle = (handle: ResizeHandle): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#22c55e',
    border: '2px solid white',
    borderRadius: 2,
    zIndex: 10,
  }

  switch (handle) {
    case 'n': return { ...base, top: -5, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' }
    case 's': return { ...base, bottom: -5, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' }
    case 'e': return { ...base, right: -5, top: '50%', transform: 'translateY(-50%)', cursor: 'e-resize' }
    case 'w': return { ...base, left: -5, top: '50%', transform: 'translateY(-50%)', cursor: 'w-resize' }
    case 'ne': return { ...base, top: -5, right: -5, cursor: 'ne-resize' }
    case 'nw': return { ...base, top: -5, left: -5, cursor: 'nw-resize' }
    case 'se': return { ...base, bottom: -5, right: -5, cursor: 'se-resize' }
    case 'sw': return { ...base, bottom: -5, left: -5, cursor: 'sw-resize' }
  }
}

// Supported image formats
const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']

// Validate image URL
const isValidImageUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

export const ImageBox = memo(function ImageBox({
  box,
  isSelected,
  onSelect,
  onDragStart,
  onResize,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onToggleLock,
  onImageUrlChange,
}: ImageBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  const [resizing, setResizing] = useState<ResizeHandle | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInputValue, setUrlInputValue] = useState('')
  const [showAltTextInput, setShowAltTextInput] = useState(false)
  const [altTextValue, setAltTextValue] = useState(box.altText || '')
  const [imageError, setImageError] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  // Handle click outside to deselect context menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showContextMenu && boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowContextMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showContextMenu])

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }, [])

  // Handle mouse down for dragging/selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Allow clicks on buttons and inputs
    if ((e.target as HTMLElement).closest('.image-box-toolbar') ||
        (e.target as HTMLElement).closest('input')) {
      return
    }
    
    e.stopPropagation()
    if (!box.locked) {
      onSelect()
      onDragStart(e)
    }
  }, [box.locked, onSelect, onDragStart])

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation()
    e.preventDefault()
    if (box.locked) return
    
    setResizing(handle)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: box.width,
      height: box.height,
    })
  }, [box.locked, box.width, box.height])

  // Handle resize move
  useEffect(() => {
    if (!resizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x
      const deltaY = e.clientY - resizeStart.y
      const shiftKey = e.shiftKey // Free resize with shift

      let newWidth = resizeStart.width
      let newHeight = resizeStart.height
      const aspectRatio = resizeStart.width / resizeStart.height

      switch (resizing) {
        case 'e':
          newWidth = Math.max(100, resizeStart.width + deltaX)
          if (!shiftKey) newHeight = newWidth / aspectRatio
          break
        case 'w':
          newWidth = Math.max(100, resizeStart.width - deltaX)
          if (!shiftKey) newHeight = newWidth / aspectRatio
          break
        case 's':
          newHeight = Math.max(50, resizeStart.height + deltaY)
          if (!shiftKey) newWidth = newHeight * aspectRatio
          break
        case 'n':
          newHeight = Math.max(50, resizeStart.height - deltaY)
          if (!shiftKey) newWidth = newHeight * aspectRatio
          break
        case 'se':
          newWidth = Math.max(100, resizeStart.width + deltaX)
          newHeight = Math.max(50, resizeStart.height + deltaY)
          if (!shiftKey) {
            const avgScale = (deltaX / resizeStart.width + deltaY / resizeStart.height) / 2
            newWidth = resizeStart.width * (1 + avgScale)
            newHeight = resizeStart.height * (1 + avgScale)
          }
          break
        case 'sw':
          newWidth = Math.max(100, resizeStart.width - deltaX)
          newHeight = Math.max(50, resizeStart.height + deltaY)
          if (!shiftKey) {
            const avgScale = (-deltaX / resizeStart.width + deltaY / resizeStart.height) / 2
            newWidth = resizeStart.width * (1 + avgScale)
            newHeight = resizeStart.height * (1 + avgScale)
          }
          break
        case 'ne':
          newWidth = Math.max(100, resizeStart.width + deltaX)
          newHeight = Math.max(50, resizeStart.height - deltaY)
          if (!shiftKey) {
            const avgScale = (deltaX / resizeStart.width - deltaY / resizeStart.height) / 2
            newWidth = resizeStart.width * (1 + avgScale)
            newHeight = resizeStart.height * (1 + avgScale)
          }
          break
        case 'nw':
          newWidth = Math.max(100, resizeStart.width - deltaX)
          newHeight = Math.max(50, resizeStart.height - deltaY)
          if (!shiftKey) {
            const avgScale = (-deltaX / resizeStart.width - deltaY / resizeStart.height) / 2
            newWidth = resizeStart.width * (1 + avgScale)
            newHeight = resizeStart.height * (1 + avgScale)
          }
          break
      }

      onResize(Math.max(100, newWidth), Math.max(50, newHeight))
    }

    const handleMouseUp = () => {
      setResizing(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing, resizeStart, onResize])

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (SUPPORTED_FORMATS.includes(file.type)) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const result = event.target?.result as string
          onImageUrlChange(result, file.name.replace(/\.[^/.]+$/, ''))
        }
        reader.readAsDataURL(file)
      }
    }
  }, [onImageUrlChange])

  // Handle file input change
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (SUPPORTED_FORMATS.includes(file.type)) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const result = event.target?.result as string
          onImageUrlChange(result, file.name.replace(/\.[^/.]+$/, ''))
        }
        reader.readAsDataURL(file)
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onImageUrlChange])

  // Handle URL paste/import
  const handleUrlSubmit = useCallback(() => {
    if (isValidImageUrl(urlInputValue)) {
      onImageUrlChange(urlInputValue, '')
      setShowUrlInput(false)
      setUrlInputValue('')
    }
  }, [urlInputValue, onImageUrlChange])

  // Handle alt text submit
  const handleAltTextSubmit = useCallback(() => {
    onImageUrlChange(box.imageUrl, altTextValue)
    setShowAltTextInput(false)
  }, [altTextValue, box.imageUrl, onImageUrlChange])

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isSelected) return

      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
              const result = event.target?.result as string
              onImageUrlChange(result, 'Pasted image')
            }
            reader.readAsDataURL(file)
          }
          return
        }
      }

      // Check for image URL in clipboard
      const text = e.clipboardData?.getData('text')
      if (text && isValidImageUrl(text)) {
        // Check if it looks like an image URL
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
        const hasImageExtension = imageExtensions.some(ext => text.toLowerCase().includes(ext))
        
        // Only auto-import if it looks like an image URL
        if (hasImageExtension || text.match(/^https?:\/\/.*\.(png|jpg|jpeg|gif|webp|svg)/i)) {
          e.preventDefault()
          onImageUrlChange(text, '')
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [isSelected, onImageUrlChange])

  // Handle image error
  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setImageError(false)
  }, [])

  // Has image content
  const hasImage = box.imageUrl && !imageError

  return (
    <div
      ref={boxRef}
      className={`
        absolute rounded-lg border-2 overflow-hidden
        transition-shadow duration-150
        ${box.locked ? 'border-orange-500/50 bg-orange-500/5' : 'border-green-500 bg-green-500/10'}
        ${isSelected ? 'ring-2 ring-white/50 shadow-lg' : 'hover:shadow-md'}
        ${isDraggingOver ? 'ring-2 ring-blue-400 bg-blue-500/20' : ''}
      `}
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        zIndex: box.zIndex,
        cursor: box.locked ? 'not-allowed' : 'move',
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true) }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
    >
      {/* Lock indicator */}
      {box.locked && (
        <div className="absolute top-1 right-1 p-1 bg-orange-500/20 rounded z-10">
          <Lock size={12} className="text-orange-400" />
        </div>
      )}

      {/* Image or placeholder */}
      {hasImage ? (
        <div className="w-full h-full relative">
          <img
            src={box.imageUrl}
            alt={box.altText || 'Image'}
            className="w-full h-full object-contain"
            onError={handleImageError}
            onLoad={handleImageLoad}
            draggable={false}
          />
          {/* Alt text indicator */}
          {isSelected && box.altText && (
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white max-w-[80%] truncate">
              {box.altText}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 p-4">
          <ImageIcon size={48} className="mb-3 opacity-50" />
          <div className="text-center text-sm mb-4">
            <p className="mb-1">Drop an image here</p>
            <p className="text-xs text-neutral-500">or paste from clipboard</p>
          </div>
          
          {/* Upload buttons */}
          <div className="image-box-toolbar flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-sm text-neutral-200 transition-colors"
            >
              <Upload size={14} />
              Upload
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowUrlInput(!showUrlInput) }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-sm text-neutral-200 transition-colors"
            >
              <LinkIcon size={14} />
              URL
            </button>
          </div>

          {/* URL input */}
          {showUrlInput && (
            <div className="absolute bottom-12 left-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={urlInputRef}
                type="url"
                placeholder="Paste image URL..."
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleUrlSubmit}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white"
              >
                Add
              </button>
              <button
                onClick={() => { setShowUrlInput(false); setUrlInputValue('') }}
                className="p-1 hover:bg-neutral-700 rounded"
              >
                <X size={14} className="text-neutral-400" />
              </button>
            </div>
          )}

          <p className="text-xs text-neutral-600 mt-3">
            PNG, JPG, GIF, WebP, SVG
          </p>
        </div>
      )}

      {/* Alt text edit button - visible when selected and has image */}
      {isSelected && hasImage && !showAltTextInput && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowAltTextInput(true); setAltTextValue(box.altText || '') }}
          className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded text-white transition-colors"
          title="Edit alt text"
        >
          <ImageIcon size={14} />
        </button>
      )}

      {/* Alt text input - visible when editing */}
      {isSelected && showAltTextInput && (
        <div 
          className="absolute bottom-2 left-2 right-2 flex gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            placeholder="Alt text for accessibility..."
            value={altTextValue}
            onChange={(e) => setAltTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAltTextSubmit()
              if (e.key === 'Escape') setShowAltTextInput(false)
            }}
            onBlur={handleAltTextSubmit}
            className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-green-500"
            autoFocus
          />
        </div>
      )}

      {/* Resize handles - visible when selected and not locked */}
      {isSelected && !box.locked && (
        <>
          {RESIZE_HANDLES.map((handle) => (
            <div
              key={handle}
              style={getHandleStyle(handle)}
              onMouseDown={(e) => handleResizeStart(e, handle)}
              className="hover:scale-125 transition-transform"
            />
          ))}
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Context menu */}
      {showContextMenu && (
        <div
          className="fixed z-50 min-w-40 py-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
        >
          {!hasImage && (
            <>
              <button
                onClick={() => { fileInputRef.current?.click(); setShowContextMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 text-sm text-neutral-200"
              >
                <Upload size={14} />
                Upload Image
              </button>
              <button
                onClick={() => { setShowUrlInput(true); setShowContextMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 text-sm text-neutral-200"
              >
                <LinkIcon size={14} />
                Add from URL
              </button>
              <div className="border-t border-neutral-700 my-1" />
            </>
          )}
          {hasImage && (
            <>
              <button
                onClick={() => { setShowAltTextInput(true); setAltTextValue(box.altText || ''); setShowContextMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 text-sm text-neutral-200"
              >
                <ImageIcon size={14} />
                Edit Alt Text
              </button>
              <div className="border-t border-neutral-700 my-1" />
            </>
          )}
          <button
            onClick={() => { onDuplicate(); setShowContextMenu(false) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 text-sm text-neutral-200"
          >
            <Copy size={14} />
            Duplicate
            <kbd className="ml-auto text-xs text-neutral-500">⌘D</kbd>
          </button>
          <button
            onClick={() => { onToggleLock(); setShowContextMenu(false) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 text-sm text-neutral-200"
          >
            {box.locked ? <Unlock size={14} /> : <Lock size={14} />}
            {box.locked ? 'Unlock' : 'Lock'}
          </button>
          <div className="border-t border-neutral-700 my-1" />
          <button
            onClick={() => { onBringToFront(); setShowContextMenu(false) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 text-sm text-neutral-200"
          >
            <ArrowUp size={14} />
            Bring to Front
          </button>
          <button
            onClick={() => { onSendToBack(); setShowContextMenu(false) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 text-sm text-neutral-200"
          >
            <ArrowDown size={14} />
            Send to Back
          </button>
          <div className="border-t border-neutral-700 my-1" />
          <button
            onClick={() => { onDelete(); setShowContextMenu(false) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/20 text-sm text-red-400"
          >
            <Trash2 size={14} />
            Delete
            <kbd className="ml-auto text-xs text-neutral-500">⌫</kbd>
          </button>
        </div>
      )}
    </div>
  )
})
