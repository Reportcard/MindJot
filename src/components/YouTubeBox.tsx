import { useState, useRef, useEffect, useCallback, memo } from 'react'
import {
  Lock,
  Unlock,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Youtube,
  Link as LinkIcon,
  X,
} from 'lucide-react'
import type { YouTubeBoxData } from '../stores/canvasStore'

interface YouTubeBoxProps {
  box: YouTubeBoxData
  isSelected: boolean
  onSelect: () => void
  onDragStart: (e: React.MouseEvent) => void
  onResize: (width: number, height: number) => void
  onDelete: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  onToggleLock: () => void
  onVideoUrlChange: (videoUrl: string) => void
}

// Resize handle positions
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const RESIZE_HANDLES: ResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

const getHandleStyle = (handle: ResizeHandle): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#ef4444',
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

// Extract YouTube video ID from various URL formats
const extractVideoId = (url: string): string | null => {
  if (!url) return null
  
  // Regular YouTube URLs
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  // Check if it's just a video ID
  if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
    return url
  }
  
  return null
}

// Get embed URL from video URL or ID
const getEmbedUrl = (url: string): string | null => {
  const videoId = extractVideoId(url)
  if (!videoId) return null
  return `https://www.youtube.com/embed/${videoId}`
}

// Validate YouTube URL
const isValidYouTubeUrl = (url: string): boolean => {
  if (!url) return false
  return extractVideoId(url) !== null
}

export const YouTubeBox = memo(function YouTubeBox({
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
  onVideoUrlChange,
}: YouTubeBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  const [resizing, setResizing] = useState<ResizeHandle | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInputValue, setUrlInputValue] = useState('')
  const [videoError, setVideoError] = useState(false)

  // Get embed URL
  const embedUrl = getEmbedUrl(box.videoUrl)
  const hasVideo = embedUrl && !videoError

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
    if ((e.target as HTMLElement).closest('.youtube-box-toolbar') ||
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
      const aspectRatio = 16 / 9 // YouTube standard aspect ratio

      switch (resizing) {
        case 'e':
          newWidth = Math.max(200, resizeStart.width + deltaX)
          if (!shiftKey) newHeight = newWidth / aspectRatio
          break
        case 'w':
          newWidth = Math.max(200, resizeStart.width - deltaX)
          if (!shiftKey) newHeight = newWidth / aspectRatio
          break
        case 's':
          newHeight = Math.max(112, resizeStart.height + deltaY)
          if (!shiftKey) newWidth = newHeight * aspectRatio
          break
        case 'n':
          newHeight = Math.max(112, resizeStart.height - deltaY)
          if (!shiftKey) newWidth = newHeight * aspectRatio
          break
        case 'se':
          newWidth = Math.max(200, resizeStart.width + deltaX)
          newHeight = Math.max(112, resizeStart.height + deltaY)
          if (!shiftKey) {
            const avgScale = (deltaX / resizeStart.width + deltaY / resizeStart.height) / 2
            newWidth = resizeStart.width * (1 + avgScale)
            newHeight = resizeStart.height * (1 + avgScale)
          }
          break
        case 'sw':
          newWidth = Math.max(200, resizeStart.width - deltaX)
          newHeight = Math.max(112, resizeStart.height + deltaY)
          if (!shiftKey) {
            const avgScale = (-deltaX / resizeStart.width + deltaY / resizeStart.height) / 2
            newWidth = resizeStart.width * (1 + avgScale)
            newHeight = resizeStart.height * (1 + avgScale)
          }
          break
        case 'ne':
          newWidth = Math.max(200, resizeStart.width + deltaX)
          newHeight = Math.max(112, resizeStart.height - deltaY)
          if (!shiftKey) {
            const avgScale = (deltaX / resizeStart.width - deltaY / resizeStart.height) / 2
            newWidth = resizeStart.width * (1 + avgScale)
            newHeight = resizeStart.height * (1 + avgScale)
          }
          break
        case 'nw':
          newWidth = Math.max(200, resizeStart.width - deltaX)
          newHeight = Math.max(112, resizeStart.height - deltaY)
          if (!shiftKey) {
            const avgScale = (-deltaX / resizeStart.width - deltaY / resizeStart.height) / 2
            newWidth = resizeStart.width * (1 + avgScale)
            newHeight = resizeStart.height * (1 + avgScale)
          }
          break
      }

      onResize(Math.max(200, newWidth), Math.max(112, newHeight))
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

  // Handle URL submit
  const handleUrlSubmit = useCallback(() => {
    if (isValidYouTubeUrl(urlInputValue)) {
      onVideoUrlChange(urlInputValue)
      setShowUrlInput(false)
      setUrlInputValue('')
      setVideoError(false)
    }
  }, [urlInputValue, onVideoUrlChange])

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isSelected) return

      const text = e.clipboardData?.getData('text')
      if (text && isValidYouTubeUrl(text)) {
        e.preventDefault()
        onVideoUrlChange(text)
        setVideoError(false)
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [isSelected, onVideoUrlChange])

  // Handle video error
  const handleVideoError = useCallback(() => {
    setVideoError(true)
  }, [])

  return (
    <div
      ref={boxRef}
      className={`
        absolute rounded-lg border-2 overflow-hidden
        transition-shadow duration-150
        ${box.locked ? 'border-red-500/50 bg-red-500/5' : 'border-red-500 bg-red-500/10'}
        ${isSelected ? 'ring-2 ring-white/50 shadow-lg' : 'hover:shadow-md'}
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
    >
      {/* Lock indicator */}
      {box.locked && (
        <div className="absolute top-1 right-1 p-1 bg-red-500/20 rounded z-10">
          <Lock size={12} className="text-red-400" />
        </div>
      )}

      {/* Video embed or placeholder */}
      {hasVideo ? (
        <div className="w-full h-full relative bg-black">
          <iframe
            src={embedUrl}
            title="YouTube video"
            className="w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onError={handleVideoError}
          />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 p-4">
          <Youtube size={48} className="mb-3 text-red-500" />
          <div className="text-center text-sm mb-4">
            <p className="mb-1">Add a YouTube video</p>
            <p className="text-xs text-neutral-500">Paste a YouTube URL or click to add</p>
          </div>
          
          {/* URL input button */}
          <div className="youtube-box-toolbar flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowUrlInput(!showUrlInput) }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded text-sm text-neutral-200 transition-colors"
            >
              <LinkIcon size={14} />
              Add URL
            </button>
          </div>

          {/* URL input */}
          {showUrlInput && (
            <div className="absolute bottom-12 left-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={urlInputRef}
                type="url"
                placeholder="Paste YouTube URL..."
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-500"
              />
              <button
                onClick={handleUrlSubmit}
                className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-sm text-white"
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

          {/* Error message */}
          {videoError && (
            <p className="text-xs text-red-400 mt-3">
              Invalid YouTube URL
            </p>
          )}
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

      {/* Context menu */}
      {showContextMenu && (
        <div
          className="fixed z-50 min-w-40 py-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
        >
          {!hasVideo && (
            <>
              <button
                onClick={() => { setShowUrlInput(true); setShowContextMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 text-sm text-neutral-200"
              >
                <LinkIcon size={14} />
                Add YouTube URL
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
