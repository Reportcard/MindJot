import { useState, useRef, useEffect, useCallback, memo } from 'react'
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code,
  Link,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import type { TextBoxData } from '../stores/canvasStore'

interface TextBoxProps {
  box: TextBoxData
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onStartEdit: () => void
  onEndEdit: () => void
  onDragStart: (e: React.MouseEvent) => void
  onContentChange: (content: string) => void
  onResize: (width: number, height: number) => void
  onDelete: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  onToggleLock: () => void
}

// Resize handle positions
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const RESIZE_HANDLES: ResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

const getHandleStyle = (handle: ResizeHandle): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#3b82f6',
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

export const TextBox = memo(function TextBox({
  box,
  isSelected,
  isEditing,
  onSelect,
  onStartEdit,
  onEndEdit,
  onDragStart,
  onContentChange,
  onResize,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  onToggleLock,
}: TextBoxProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  const [resizing, setResizing] = useState<ResizeHandle | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  // Focus editor when entering edit mode
  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus()
      // Set cursor to end
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(contentRef.current)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [isEditing])

  // Handle click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showContextMenu && boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowContextMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showContextMenu])

  // Format text using execCommand
  const formatText = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    contentRef.current?.focus()
  }, [])

  // Handle double-click to enter edit mode
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!box.locked) {
      onStartEdit()
    }
  }, [box.locked, onStartEdit])

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }, [])

  // Handle content blur
  const handleBlur = useCallback(() => {
    if (contentRef.current) {
      onContentChange(contentRef.current.innerHTML)
    }
    onEndEdit()
  }, [onContentChange, onEndEdit])

  // Handle mouse down for dragging/selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isEditing) {
      onSelect()
      if (!box.locked) {
        onDragStart(e)
      }
    }
  }, [isEditing, box.locked, onSelect, onDragStart])

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

  // Keyboard handling for editor
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isEditing) {
      // Prevent canvas shortcuts while editing
      e.stopPropagation()
      
      // Format shortcuts
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault()
            formatText('bold')
            break
          case 'i':
            e.preventDefault()
            formatText('italic')
            break
          case 'u':
            e.preventDefault()
            formatText('underline')
            break
        }
      }

      // Escape to exit edit mode
      if (e.key === 'Escape') {
        e.preventDefault()
        handleBlur()
      }
    }
  }, [isEditing, formatText, handleBlur])

  // Insert link
  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:')
    if (url) {
      formatText('createLink', url)
    }
  }, [formatText])

  return (
    <div
      ref={boxRef}
      className={`
        absolute rounded-lg border-2 overflow-hidden
        transition-shadow duration-150
        ${box.locked ? 'border-orange-500/50 bg-orange-500/5' : 'border-blue-500 bg-blue-500/10'}
        ${isSelected ? 'ring-2 ring-white/50 shadow-lg' : 'hover:shadow-md'}
        ${isEditing ? 'ring-2 ring-blue-400' : ''}
      `}
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        zIndex: box.zIndex,
        cursor: box.locked ? 'not-allowed' : (isEditing ? 'text' : 'move'),
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
    >
      {/* Lock indicator */}
      {box.locked && (
        <div className="absolute top-1 right-1 p-1 bg-orange-500/20 rounded">
          <Lock size={12} className="text-orange-400" />
        </div>
      )}

      {/* Rich text toolbar - visible when editing */}
      {isEditing && (
        <div className="absolute -top-10 left-0 flex items-center gap-1 px-2 py-1 bg-neutral-800 rounded-t-lg border border-neutral-700 z-20">
          <button
            onClick={() => formatText('bold')}
            className="p-1 hover:bg-neutral-700 rounded"
            title="Bold (Ctrl+B)"
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => formatText('italic')}
            className="p-1 hover:bg-neutral-700 rounded"
            title="Italic (Ctrl+I)"
          >
            <Italic size={14} />
          </button>
          <button
            onClick={() => formatText('underline')}
            className="p-1 hover:bg-neutral-700 rounded"
            title="Underline (Ctrl+U)"
          >
            <Underline size={14} />
          </button>
          <div className="w-px h-4 bg-neutral-600 mx-1" />
          <button
            onClick={() => formatText('formatBlock', 'h1')}
            className="p-1 hover:bg-neutral-700 rounded"
            title="Heading 1"
          >
            <Heading1 size={14} />
          </button>
          <button
            onClick={() => formatText('formatBlock', 'h2')}
            className="p-1 hover:bg-neutral-700 rounded"
            title="Heading 2"
          >
            <Heading2 size={14} />
          </button>
          <div className="w-px h-4 bg-neutral-600 mx-1" />
          <button
            onClick={() => formatText('insertUnorderedList')}
            className="p-1 hover:bg-neutral-700 rounded"
            title="Bullet List"
          >
            <List size={14} />
          </button>
          <button
            onClick={() => formatText('insertOrderedList')}
            className="p-1 hover:bg-neutral-700 rounded"
            title="Numbered List"
          >
            <ListOrdered size={14} />
          </button>
          <div className="w-px h-4 bg-neutral-600 mx-1" />
          <button
            onClick={() => formatText('formatBlock', 'pre')}
            className="p-1 hover:bg-neutral-700 rounded"
            title="Code Block"
          >
            <Code size={14} />
          </button>
          <button
            onClick={insertLink}
            className="p-1 hover:bg-neutral-700 rounded"
            title="Insert Link"
          >
            <Link size={14} />
          </button>
        </div>
      )}

      {/* Content area */}
      <div
        ref={contentRef}
        className={`
          w-full h-full p-3 overflow-auto
          text-neutral-200 text-sm
          focus:outline-none
          ${isEditing ? '' : 'pointer-events-none'}
          [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2
          [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mb-2
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2
          [&_pre]:bg-neutral-800 [&_pre]:p-2 [&_pre]:rounded [&_pre]:font-mono [&_pre]:text-xs
          [&_a]:text-blue-400 [&_a]:underline
        `}
        contentEditable={isEditing}
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: box.content || 'Double-click to edit...' }}
        onBlur={handleBlur}
      />

      {/* Resize handles - visible when selected but not editing */}
      {isSelected && !isEditing && !box.locked && (
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
