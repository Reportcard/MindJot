import { useState, useRef, useEffect, useCallback, memo } from 'react'
import {
  Lock,
  Unlock,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Send,
  Bot,
  Loader2,
} from 'lucide-react'
import type { Box } from '../stores/canvasStore'

export interface AIBoxData extends Box {
  type: 'ai'
  messages: AIMessage[]
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface AIBoxProps {
  box: AIBoxData
  isSelected: boolean
  onSelect: () => void
  onDragStart: (e: React.MouseEvent) => void
  onResize: (width: number, height: number) => void
  onDelete: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  onToggleLock: () => void
  onMessagesChange: (messages: AIMessage[]) => void
}

// Resize handle positions
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const RESIZE_HANDLES: ResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

const getHandleStyle = (handle: ResizeHandle): React.CSSProperties => {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: '#eab308',
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

const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const AIBox = memo(function AIBox({
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
  onMessagesChange,
}: AIBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  const [resizing, setResizing] = useState<ResizeHandle | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const messages = box.messages || []

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

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
    if ((e.target as HTMLElement).closest('.ai-input-area')) {
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
      const shiftKey = e.shiftKey

      let newWidth = resizeStart.width
      let newHeight = resizeStart.height
      const aspectRatio = resizeStart.width / resizeStart.height

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
          newHeight = Math.max(150, resizeStart.height + deltaY)
          if (!shiftKey) newWidth = newHeight * aspectRatio
          break
        case 'n':
          newHeight = Math.max(150, resizeStart.height - deltaY)
          if (!shiftKey) newWidth = newHeight * aspectRatio
          break
        case 'se':
          newWidth = Math.max(200, resizeStart.width + deltaX)
          newHeight = Math.max(150, resizeStart.height + deltaY)
          if (!shiftKey) {
            const avgScale = (deltaX / resizeStart.width + deltaY / resizeStart.height) / 2
            newWidth = resizeStart.width * (1 + avgScale)
            newHeight = resizeStart.height * (1 + avgScale)
          }
          break
        case 'sw':
          newWidth = Math.max(200, resizeStart.width - deltaX)
          newHeight = Math.max(150, resizeStart.height + deltaY)
          if (!shiftKey) {
            const avgScale = (-deltaX / resizeStart.width + deltaY / resizeStart.height) / 2
            newWidth = resizeStart.width * (1 + avgScale)
            newHeight = resizeStart.height * (1 + avgScale)
          }
          break
        case 'ne':
          newWidth = Math.max(200, resizeStart.width + deltaX)
          newHeight = Math.max(150, resizeStart.height - deltaY)
          if (!shiftKey) {
            const avgScale = (deltaX / resizeStart.width - deltaY / resizeStart.height) / 2
            newWidth = resizeStart.width * (1 + avgScale)
            newHeight = resizeStart.height * (1 + avgScale)
          }
          break
        case 'nw':
          newWidth = Math.max(200, resizeStart.width - deltaX)
          newHeight = Math.max(150, resizeStart.height - deltaY)
          if (!shiftKey) {
            const avgScale = (-deltaX / resizeStart.width - deltaY / resizeStart.height) / 2
            newWidth = resizeStart.width * (1 + avgScale)
            newHeight = resizeStart.height * (1 + avgScale)
          }
          break
      }

      onResize(Math.max(200, newWidth), Math.max(150, newHeight))
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

  // Send message
  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim() || isLoading || box.locked) return

    const userMessage: AIMessage = {
      id: generateId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: Date.now(),
    }

    const newMessages = [...messages, userMessage]
    onMessagesChange(newMessages)
    setInputValue('')
    setIsLoading(true)

    // Simulate AI response (in a real app, this would call an API)
    setTimeout(() => {
      const assistantMessage: AIMessage = {
        id: generateId(),
        role: 'assistant',
        content: `This is a simulated response to: "${userMessage.content}". Connect an AI API to make this functional!`,
        timestamp: Date.now(),
      }
      onMessagesChange([...newMessages, assistantMessage])
      setIsLoading(false)
    }, 1000)
  }, [inputValue, isLoading, box.locked, messages, onMessagesChange])

  // Handle input key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  return (
    <div
      ref={boxRef}
      className={`
        absolute rounded-lg border-2 overflow-hidden flex flex-col
        transition-shadow duration-150
        ${box.locked ? 'border-orange-500/50 bg-orange-500/5' : 'border-yellow-500 bg-yellow-500/10'}
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

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border-b border-yellow-500/30">
        <Bot size={16} className="text-yellow-400" />
        <span className="text-sm font-medium text-yellow-200">AI Chat</span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-neutral-500 text-sm py-4">
            <Bot size={24} className="mx-auto mb-2 opacity-50" />
            <p>Start a conversation</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-700 text-neutral-200'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-neutral-700 text-neutral-200 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="ai-input-area p-3 border-t border-yellow-500/30 bg-yellow-500/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={box.locked ? 'Locked' : 'Ask something...'}
            disabled={box.locked}
            className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-yellow-500 disabled:opacity-50"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || box.locked}
            className="p-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-neutral-700 disabled:text-neutral-500 rounded-lg transition-colors"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Resize handles - visible when selected but not locked */}
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
