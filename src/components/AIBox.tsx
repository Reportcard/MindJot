import { useState, useRef, useEffect, useCallback, memo } from 'react'
import {
  Send,
  Trash2,
  Copy,
  RefreshCw,
  X,
  Lock,
  Unlock,
  ChevronDown,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  Bot,
  User,
} from 'lucide-react'
import type { AIBoxData, AIMessage, AIProvider } from '../stores/aiStore'
import { useAIStore, AI_MODELS, getModelsByProvider, createAIMessage } from '../stores/aiStore'
import { makeAIRequest } from '../lib/aiApi'

interface AIBoxProps {
  box: AIBoxData
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onStartEdit: () => void
  onEndEdit: () => void
  onDragStart: (e: React.MouseEvent) => void
  onContentChange?: (messages: AIMessage[]) => void
  onResize: (width: number, height: number) => void
  onDelete: () => void
  onDuplicate: () => void
  onBringToFront: () => void
  onSendToBack: () => void
  onToggleLock: () => void
  onUpdate: (updates: Partial<AIBoxData>) => void
}

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

export const AIBox = memo(function AIBox({
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
  onUpdate,
}: AIBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
  const [resizing, setResizing] = useState<ResizeHandle | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const { apiKeys, defaultProvider, defaultModel, setDefaultProvider, setDefaultModel } = useAIStore()
  
  // Get available models for current provider
  const availableModels = getModelsByProvider(box.provider)
  const currentModel = AI_MODELS.find(m => m.id === box.model)
  const hasApiKey = !!apiKeys[box.provider]
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [box.messages, isStreaming])
  
  // Send message to AI
  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming || !hasApiKey) return
    
    const userMessage = createAIMessage('user', input.trim())
    const newMessages = [...box.messages, userMessage]
    
    onUpdate({ messages: newMessages, isStreaming: true })
    setInput('')
    setError(null)
    
    try {
      let assistantContent = ''
      
      const config = {
        provider: box.provider,
        apiKey: apiKeys[box.provider],
        model: box.model,
        messages: newMessages,
      }
      
      for await (const chunk of makeAIRequest(config, () => {})) {
        assistantContent += chunk
      }
      
      const assistantMessage = createAIMessage('assistant', assistantContent)
      onUpdate({
        messages: [...newMessages, assistantMessage],
        isStreaming: false,
      })
    } catch (err) {
      console.error('AI request failed:', err)
      setError(err instanceof Error ? err.message : 'Request failed')
      onUpdate({ isStreaming: false })
    }
  }, [input, isStreaming, hasApiKey, box, apiKeys, onUpdate])
  
  // Handle streaming response
  const handleStreamResponse = useCallback(async () => {
    if (isStreaming || !hasApiKey) return
    
    const userMessage = createAIMessage('user', input.trim())
    const newMessages = [...box.messages, userMessage]
    
    onUpdate({ messages: newMessages, isStreaming: true })
    setInput('')
    setError(null)
    
    try {
      let assistantContent = ''
      const config = {
        provider: box.provider,
        apiKey: apiKeys[box.provider],
        model: box.model,
        messages: newMessages,
      }
      
      for await (const chunk of makeAIRequest(config, (chunk, done) => {
        if (!done) {
          assistantContent += chunk
          // Update in real-time
          const tempAssistant = createAIMessage('assistant', assistantContent)
          onUpdate({ messages: [...newMessages, tempAssistant] })
        }
      })) {
        // Chunk already handled in the callback
      }
    } catch (err) {
      console.error('AI request failed:', err)
      setError(err instanceof Error ? err.message : 'Request failed')
      onUpdate({ isStreaming: false })
    }
  }, [input, isStreaming, hasApiKey, box, apiKeys, onUpdate])
  
  // Regenerate last response
  const handleRegenerate = useCallback(async () => {
    if (box.messages.length === 0 || isStreaming) return
    
    // Find the last user message
    const lastUserIndex = box.messages.map(m => m.role).lastIndexOf('user')
    if (lastUserIndex === -1) return
    
    const messagesToKeep = box.messages.slice(0, lastUserIndex)
    const userMessage = box.messages[lastUserIndex]
    
    onUpdate({ messages: messagesToKeep, isStreaming: true })
    
    try {
      let assistantContent = ''
      const config = {
        provider: box.provider,
        apiKey: apiKeys[box.provider],
        model: box.model,
        messages: [...messagesToKeep, userMessage],
      }
      
      for await (const chunk of makeAIRequest(config, () => {})) {
        assistantContent += chunk
      }
      
      const assistantMessage = createAIMessage('assistant', assistantContent)
      onUpdate({
        messages: [...messagesToKeep, userMessage, assistantMessage],
        isStreaming: false,
      })
    } catch (err) {
      console.error('Regenerate failed:', err)
      setError(err instanceof Error ? err.message : 'Regenerate failed')
      onUpdate({ isStreaming: false })
    }
  }, [box.messages, isStreaming, box.provider, apiKeys, box.model, onUpdate])
  
  // Copy last response to clipboard
  const handleCopyLastResponse = useCallback(async () => {
    const lastAssistant = box.messages.filter(m => m.role === 'assistant').pop()
    if (!lastAssistant) return
    
    await navigator.clipboard.writeText(lastAssistant.content)
    setCopyFeedback(lastAssistant.id)
    setTimeout(() => setCopyFeedback(null), 2000)
  }, [box.messages])
  
  // Clear chat history
  const handleClearHistory = useCallback(() => {
    onUpdate({ messages: [] })
  }, [onUpdate])
  
  // Handle provider/model change
  const handleProviderChange = useCallback((provider: AIProvider) => {
    const models = getModelsByProvider(provider)
    const defaultModelForProvider = AI_MODELS.find(m => m.provider === provider)?.id || models[0]?.id
    onUpdate({ provider, model: defaultModelForProvider })
  }, [onUpdate])
  
  const handleModelChange = useCallback((model: string) => {
    onUpdate({ model })
  }, [onUpdate])
  
  // Handle resize
  const handleResizeStart = (handle: ResizeHandle) => (e: React.MouseEvent) => {
    e.stopPropagation()
    setResizing(handle)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: box.width,
      height: box.height,
    })
  }
  
  useEffect(() => {
    if (!resizing) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x
      const deltaY = e.clientY - resizeStart.y
      
      let newWidth = resizeStart.width
      let newHeight = resizeStart.height
      
      if (resizing.includes('e')) newWidth = Math.max(320, resizeStart.width + deltaX)
      if (resizing.includes('w')) newWidth = Math.max(320, resizeStart.width - deltaX)
      if (resizing.includes('s')) newHeight = Math.max(300, resizeStart.height + deltaY)
      if (resizing.includes('n')) newHeight = Math.max(300, resizeStart.height - deltaY)
      
      onResize(newWidth, newHeight)
    }
    
    const handleMouseUp = () => {
      setResizing(null)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing, resizeStart, onResize])
  
  // Context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
    setShowContextMenu(true)
  }
  
  useEffect(() => {
    const handleClick = () => setShowContextMenu(false)
    if (showContextMenu) {
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [showContextMenu])
  
  // Keyboard shortcut for sending
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleStreamResponse()
    }
  }
  
  const providerLabels: Record<AIProvider, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
  }
  
  return (
    <div
      ref={boxRef}
      className={`
        absolute rounded-lg border-2 bg-neutral-900 flex flex-col
        transition-shadow duration-150
        ${isSelected ? 'border-yellow-500 ring-2 ring-white/50 shadow-lg' : 'border-yellow-500/50 hover:shadow-md'}
        ${box.locked ? 'opacity-80' : ''}
      `}
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        zIndex: box.zIndex,
      }}
      onMouseDown={(e) => {
        if (resizing) return
        e.stopPropagation()
        onSelect()
        onDragStart(e)
      }}
      onDoubleClick={() => !box.locked && onStartEdit()}
      onContextMenu={handleContextMenu}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700 bg-neutral-800/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-yellow-500" />
          <span className="text-sm font-medium text-neutral-200">AI Chat</span>
          {!hasApiKey && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <AlertCircle size={12} />
              No API key
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Provider/Model selector */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowModelSelector(!showModelSelector)
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600 rounded text-neutral-300"
            >
              {providerLabels[box.provider]}
              <ChevronDown size={12} />
            </button>
            
            {showModelSelector && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-20">
                <div className="p-2 border-b border-neutral-700">
                  <div className="text-xs text-neutral-400 mb-1">Provider</div>
                  <div className="flex gap-1">
                    {(['openai', 'anthropic', 'google'] as AIProvider[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => handleProviderChange(p)}
                        className={`px-2 py-1 text-xs rounded ${
                          box.provider === p 
                            ? 'bg-yellow-500 text-black' 
                            : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                        }`}
                      >
                        {providerLabels[p]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-2">
                  <div className="text-xs text-neutral-400 mb-1">Model</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {availableModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          handleModelChange(model.id)
                          setShowModelSelector(false)
                        }}
                        className={`w-full text-left px-2 py-1 text-xs rounded ${
                          box.model === model.id 
                            ? 'bg-yellow-500/20 text-yellow-400' 
                            : 'text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Lock toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleLock()
            }}
            className="p-1 hover:bg-neutral-700 rounded text-neutral-400 hover:text-neutral-200"
          >
            {box.locked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {box.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500">
            <Bot size={32} className="mb-2 opacity-50" />
            <p className="text-sm">Start a conversation</p>
          </div>
        )}
        
        {box.messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Bot size={14} className="text-yellow-500" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-neutral-200'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
              
              {message.role === 'assistant' && message.content && (
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-neutral-700">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      await navigator.clipboard.writeText(message.content)
                      setCopyFeedback(message.id)
                      setTimeout(() => setCopyFeedback(null), 2000)
                    }}
                    className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200"
                  >
                    {copyFeedback === message.id ? <Check size={12} /> : <Copy size={12} />}
                    {copyFeedback === message.id ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
            
            {message.role === 'user' && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isStreaming && (
          <div className="flex gap-2 justify-start">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Bot size={14} className="text-yellow-500" />
            </div>
            <div className="bg-neutral-800 px-3 py-2 rounded-lg">
              <Loader2 size={16} className="animate-spin text-yellow-500" />
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="p-3 border-t border-neutral-700 bg-neutral-800/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasApiKey ? 'Message AI...' : 'Configure API key in settings'}
            disabled={!hasApiKey || isStreaming || box.locked}
            className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-yellow-500 disabled:opacity-50"
          />
          <button
            onClick={handleStreamResponse}
            disabled={!input.trim() || !hasApiKey || isStreaming || box.locked}
            className="px-3 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:bg-neutral-700 disabled:text-neutral-500 text-black rounded-lg transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        
        {/* Actions */}
        {box.messages.length > 0 && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-700">
            <button
              onClick={handleRegenerate}
              disabled={isStreaming || !hasApiKey}
              className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 disabled:opacity-50"
            >
              <RefreshCw size={12} />
              Regenerate
            </button>
            <button
              onClick={handleCopyLastResponse}
              disabled={!box.messages.filter(m => m.role === 'assistant').length}
              className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 disabled:opacity-50"
            >
              <Copy size={12} />
              Copy
            </button>
            <button
              onClick={handleClearHistory}
              disabled={isStreaming}
              className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-red-400 disabled:opacity-50"
            >
              <Trash2 size={12} />
              Clear
            </button>
          </div>
        )}
      </div>
      
      {/* Resize handles */}
      {isSelected && !box.locked && RESIZE_HANDLES.map((handle) => (
        <div
          key={handle}
          style={getHandleStyle(handle)}
          onMouseDown={handleResizeStart(handle)}
        />
      ))}
      
      {/* Context menu */}
      {showContextMenu && (
        <div
          className="fixed bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-30 py-1 min-w-[160px]"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onDuplicate()
              setShowContextMenu(false)
            }}
            className="w-full px-3 py-1.5 text-left text-sm text-neutral-200 hover:bg-neutral-700"
          >
            Duplicate
          </button>
          <button
            onClick={() => {
              onBringToFront()
              setShowContextMenu(false)
            }}
            className="w-full px-3 py-1.5 text-left text-sm text-neutral-200 hover:bg-neutral-700"
          >
            Bring to Front
          </button>
          <button
            onClick={() => {
              onSendToBack()
              setShowContextMenu(false)
            }}
            className="w-full px-3 py-1.5 text-left text-sm text-neutral-200 hover:bg-neutral-700"
          >
            Send to Back
          </button>
          <hr className="my-1 border-neutral-700" />
          <button
            onClick={() => {
              onDelete()
              setShowContextMenu(false)
            }}
            className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-neutral-700"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
})
