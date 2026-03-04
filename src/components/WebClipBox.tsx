import { useState, useRef, useEffect, useCallback, memo } from 'react'
import {
  Lock,
  Unlock,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Globe,
  Link as LinkIcon,
  ExternalLink,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react'
import type { WebClipBoxData } from '../stores/canvasStore'

// Metadata fetched from URL
export interface WebClipMetadata {
  title?: string
  description?: string
  favicon?: string
  thumbnail?: string
  siteName?: string
}

interface WebClipBoxProps {
  box: WebClipBoxData
  isSelected: boolean
  onSelect: () => void
  onDragStart: (e: React.MouseEvent) => void
  onResize: (width: number, height: number) => void
  onDelete: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  onToggleLock: () => void
  onUrlChange: (url: string, metadata?: WebClipMetadata) => void
}

// Resize handle positions
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const RESIZE_HANDLES: ResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

const getHandleStyle = (handle: ResizeHandle): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#a855f7',
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

// Validate URL
const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url)
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
  } catch {
    return false
  }
}

// Normalize URL (add https:// if missing)
const normalizeUrl = (url: string): string => {
  let normalized = url.trim()
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized
  }
  return normalized
}

// Get domain from URL
const getDomain = (url: string): string => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return ''
  }
}

// Fetch metadata using CORS proxy
const fetchMetadata = async (url: string): Promise<WebClipMetadata> => {
  try {
    // Use allorigins.win as CORS proxy
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    const response = await fetch(proxyUrl)
    const data = await response.json()
    
    if (!data.contents) {
      throw new Error('Failed to fetch page content')
    }
    
    const html = data.contents
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    
    // Extract metadata
    const getMetaContent = (selectors: string[]): string | undefined => {
      for (const selector of selectors) {
        const el = doc.querySelector(selector)
        const content = el?.getAttribute('content') || el?.textContent
        if (content) return content.trim()
      }
      return undefined
    }
    
    const title = getMetaContent([
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'title',
    ])
    
    const description = getMetaContent([
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]',
    ])
    
    const thumbnail = getMetaContent([
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:src"]',
    ])
    
    const siteName = getMetaContent([
      'meta[property="og:site_name"]',
      'meta[name="application-name"]',
    ])
    
    // Get favicon
    const domain = getDomain(url)
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
    
    return {
      title: title || getDomain(url),
      description,
      favicon,
      thumbnail,
      siteName,
    }
  } catch (error) {
    console.error('Failed to fetch metadata:', error)
    // Return basic metadata from URL
    const domain = getDomain(url)
    return {
      title: domain,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    }
  }
}

export const WebClipBox = memo(function WebClipBox({
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
  onUrlChange,
}: WebClipBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  const [resizing, setResizing] = useState<ResizeHandle | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [showUrlInput, setShowUrlInput] = useState(!box.url)
  const [urlInputValue, setUrlInputValue] = useState(box.url || '')
  const [isLoading, setIsLoading] = useState(false)
  const [thumbnailError, setThumbnailError] = useState(false)

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
    if ((e.target as HTMLElement).closest('.webclip-box-toolbar') ||
        (e.target as HTMLElement).closest('input') ||
        (e.target as HTMLElement).closest('a')) {
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

      let newWidth = resizeStart.width
      let newHeight = resizeStart.height

      switch (resizing) {
        case 'e':
          newWidth = Math.max(250, resizeStart.width + deltaX)
          break
        case 'w':
          newWidth = Math.max(250, resizeStart.width - deltaX)
          break
        case 's':
          newHeight = Math.max(120, resizeStart.height + deltaY)
          break
        case 'n':
          newHeight = Math.max(120, resizeStart.height - deltaY)
          break
        case 'se':
          newWidth = Math.max(250, resizeStart.width + deltaX)
          newHeight = Math.max(120, resizeStart.height + deltaY)
          break
        case 'sw':
          newWidth = Math.max(250, resizeStart.width - deltaX)
          newHeight = Math.max(120, resizeStart.height + deltaY)
          break
        case 'ne':
          newWidth = Math.max(250, resizeStart.width + deltaX)
          newHeight = Math.max(120, resizeStart.height - deltaY)
          break
        case 'nw':
          newWidth = Math.max(250, resizeStart.width - deltaX)
          newHeight = Math.max(120, resizeStart.height - deltaY)
          break
      }

      onResize(newWidth, newHeight)
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
  const handleUrlSubmit = useCallback(async () => {
    const normalized = normalizeUrl(urlInputValue)
    if (!isValidUrl(normalized)) return
    
    setIsLoading(true)
    setShowUrlInput(false)
    
    try {
      const metadata = await fetchMetadata(normalized)
      onUrlChange(normalized, metadata)
    } catch {
      // Still set the URL even if metadata fetch fails
      onUrlChange(normalized, {
        title: getDomain(normalized),
        favicon: `https://www.google.com/s2/favicons?domain=${getDomain(normalized)}&sz=64`,
      })
    } finally {
      setIsLoading(false)
    }
  }, [urlInputValue, onUrlChange])

  // Handle refresh metadata
  const handleRefresh = useCallback(async () => {
    if (!box.url) return
    
    setIsLoading(true)
    try {
      const metadata = await fetchMetadata(box.url)
      onUrlChange(box.url, metadata)
    } finally {
      setIsLoading(false)
    }
  }, [box.url, onUrlChange])

  // Open URL in browser
  const handleOpenUrl = useCallback(() => {
    if (box.url) {
      window.open(box.url, '_blank', 'noopener,noreferrer')
    }
  }, [box.url])

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isSelected || !showUrlInput) return
      
      const text = e.clipboardData?.getData('text')
      if (text) {
        const normalized = normalizeUrl(text)
        if (isValidUrl(normalized)) {
          setUrlInputValue(normalized)
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [isSelected, showUrlInput])

  const hasContent = box.url && !showUrlInput

  return (
    <div
      ref={boxRef}
      className={`
        absolute rounded-lg border-2 overflow-hidden
        transition-shadow duration-150
        ${box.locked ? 'border-orange-500/50 bg-orange-500/5' : 'border-purple-500 bg-purple-500/10'}
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
        <div className="absolute top-1 right-1 p-1 bg-orange-500/20 rounded z-10">
          <Lock size={12} className="text-orange-400" />
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 z-20">
          <Loader2 size={32} className="text-purple-400 animate-spin" />
        </div>
      )}

      {/* Content or URL input */}
      {hasContent ? (
        <div 
          className="w-full h-full flex flex-col cursor-pointer group"
          onClick={handleOpenUrl}
        >
          {/* Thumbnail */}
          {box.thumbnail && !thumbnailError && (
            <div className="relative w-full h-32 flex-shrink-0 bg-neutral-800">
              <img
                src={box.thumbnail}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setThumbnailError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 to-transparent" />
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 p-3 flex flex-col min-h-0 overflow-hidden">
            {/* Header with favicon */}
            <div className="flex items-start gap-2 mb-2">
              {box.favicon && (
                <img 
                  src={box.favicon} 
                  alt="" 
                  className="w-5 h-5 flex-shrink-0 rounded"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-neutral-200 text-sm leading-tight line-clamp-2 group-hover:text-purple-300 transition-colors">
                  {box.title || getDomain(box.url)}
                </h3>
                {box.siteName && box.siteName !== box.title && (
                  <p className="text-xs text-neutral-500 mt-0.5">{box.siteName}</p>
                )}
              </div>
            </div>
            
            {/* Description */}
            {box.description && (
              <p className="text-xs text-neutral-400 line-clamp-3 flex-1">
                {box.description}
              </p>
            )}
            
            {/* URL */}
            <div className="flex items-center gap-1 mt-2 text-xs text-neutral-500 truncate">
              <LinkIcon size={10} className="flex-shrink-0" />
              <span className="truncate">{getDomain(box.url)}</span>
              <ExternalLink size={10} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Hover toolbar */}
          {isSelected && !box.locked && (
            <div className="webclip-box-toolbar absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); setShowUrlInput(true); setUrlInputValue(box.url || '') }}
                className="p-1.5 bg-black/60 hover:bg-black/80 rounded text-white transition-colors"
                title="Edit URL"
              >
                <LinkIcon size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleRefresh() }}
                className="p-1.5 bg-black/60 hover:bg-black/80 rounded text-white transition-colors"
                title="Refresh metadata"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 p-4">
          <Globe size={48} className="mb-3 opacity-50" />
          <div className="text-center text-sm mb-4">
            <p className="mb-1">Add a web link</p>
            <p className="text-xs text-neutral-500">Paste or type a URL</p>
          </div>
          
          {/* URL input */}
          <div className="webclip-box-toolbar w-full max-w-sm px-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1">
              <input
                ref={urlInputRef}
                type="url"
                placeholder="https://example.com"
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                autoFocus
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInputValue.trim()}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-neutral-700 disabled:text-neutral-500 rounded text-sm text-white transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit URL overlay */}
      {showUrlInput && hasContent && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/95 p-4 z-30" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-sm">
            <div className="flex gap-1 mb-2">
              <input
                type="url"
                placeholder="https://example.com"
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUrlSubmit()
                  if (e.key === 'Escape') setShowUrlInput(false)
                }}
                className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-600 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                autoFocus
              />
              <button
                onClick={handleUrlSubmit}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm text-white"
              >
                Save
              </button>
              <button
                onClick={() => setShowUrlInput(false)}
                className="p-2 hover:bg-neutral-700 rounded"
              >
                <X size={16} className="text-neutral-400" />
              </button>
            </div>
          </div>
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
          {box.url && (
            <>
              <button
                onClick={() => { handleOpenUrl(); setShowContextMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 text-sm text-neutral-200"
              >
                <ExternalLink size={14} />
                Open in Browser
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(box.url!); setShowContextMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 text-sm text-neutral-200"
              >
                <Copy size={14} />
                Copy URL
              </button>
              <button
                onClick={() => { setShowUrlInput(true); setUrlInputValue(box.url || ''); setShowContextMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 text-sm text-neutral-200"
              >
                <LinkIcon size={14} />
                Edit URL
              </button>
              <button
                onClick={() => { handleRefresh(); setShowContextMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-700 text-sm text-neutral-200"
              >
                <RefreshCw size={14} />
                Refresh Metadata
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
