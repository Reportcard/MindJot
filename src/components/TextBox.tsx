import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Link as LinkIcon,
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
  const boxRef = useRef<HTMLDivElement>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  const [resizing, setResizing] = useState<ResizeHandle | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  // TipTap editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-400 underline cursor-pointer',
        },
      }),
    ],
    content: box.content || '<p>Double-click to edit...</p>',
    editable: isEditing,
    onUpdate: ({ editor }) => {
      onContentChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'w-full h-full p-3 overflow-auto text-neutral-200 text-sm focus:outline-none prose prose-invert prose-sm max-w-none',
      },
      handleKeyDown: (view, event) => {
        // Prevent canvas shortcuts while editing
        event.stopPropagation()
        
        // Escape to exit edit mode
        if (event.key === 'Escape') {
          event.preventDefault()
          onEndEdit()
          return true
        }
        return false
      },
    },
  })

  // Update editor editability when isEditing changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing)
      if (isEditing) {
        // Focus the editor and move cursor to end
        editor.commands.focus('end')
      }
    }
  }, [isEditing, editor])

  // Update editor content when box.content changes externally
  useEffect(() => {
    if (editor && !isEditing) {
      const currentContent = editor.getHTML()
      if (currentContent !== box.content && box.content) {
        editor.commands.setContent(box.content)
      }
    }
  }, [box.content, editor, isEditing])

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

  // Handle mouse down for dragging/selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Allow clicks on toolbar buttons
    if ((e.target as HTMLElement).closest('.editor-toolbar')) {
      return
    }
    
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

  // Insert link
  const insertLink = useCallback(() => {
    if (!editor) return
    const url = prompt('Enter URL:', 'https://')
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }, [editor])

  // Toolbar button component
  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    title, 
    children 
  }: { 
    onClick: () => void
    isActive?: boolean
    title: string
    children: React.ReactNode 
  }) => (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      className={`p-1 hover:bg-neutral-700 rounded transition-colors ${
        isActive ? 'bg-neutral-600 text-blue-400' : ''
      }`}
      title={title}
    >
      {children}
    </button>
  )

  return (
    <div
      ref={boxRef}
      className={`
        absolute rounded-lg border-2 overflow-visible
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
    >
      {/* Lock indicator */}
      {box.locked && (
        <div className="absolute top-1 right-1 p-1 bg-orange-500/20 rounded z-10">
          <Lock size={12} className="text-orange-400" />
        </div>
      )}

      {/* Rich text toolbar - visible when editing */}
      {isEditing && editor && (
        <div 
          className="editor-toolbar absolute -top-10 left-0 flex items-center gap-1 px-2 py-1 bg-neutral-800 rounded-t-lg border border-neutral-700 z-20"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={14} />
          </ToolbarButton>
          <div className="w-px h-4 bg-neutral-600 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 size={14} />
          </ToolbarButton>
          <div className="w-px h-4 bg-neutral-600 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered size={14} />
          </ToolbarButton>
          <div className="w-px h-4 bg-neutral-600 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code size={14} />
          </ToolbarButton>
          <ToolbarButton
            onClick={insertLink}
            isActive={editor.isActive('link')}
            title="Insert Link"
          >
            <LinkIcon size={14} />
          </ToolbarButton>
        </div>
      )}

      {/* Content area with TipTap editor */}
      <div 
        className={`
          w-full h-full overflow-auto
          [&_.ProseMirror]:w-full [&_.ProseMirror]:h-full [&_.ProseMirror]:p-3
          [&_.ProseMirror]:outline-none
          [&_.ProseMirror_h1]:text-xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mb-2
          [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mb-2
          [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mb-2
          [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:mb-2
          [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:mb-2
          [&_.ProseMirror_pre]:bg-neutral-800 [&_.ProseMirror_pre]:p-2 [&_.ProseMirror_pre]:rounded [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-xs [&_.ProseMirror_pre]:my-2
          [&_.ProseMirror_code]:bg-neutral-800 [&_.ProseMirror_code]:px-1 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:font-mono [&_.ProseMirror_code]:text-xs
          [&_.ProseMirror_a]:text-blue-400 [&_.ProseMirror_a]:underline
          [&_.ProseMirror_p]:mb-1
          ${isEditing ? '' : 'pointer-events-none'}
        `}
      >
        <EditorContent editor={editor} />
      </div>

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
