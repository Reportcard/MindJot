import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X, Type, Image, Globe, Sparkles, Youtube } from 'lucide-react'
import { useCanvasStore } from '../stores/canvasStore'
import type { Box } from '../stores/canvasStore'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

function getBoxIcon(type: Box['type']) {
  switch (type) {
    case 'text': return <Type size={14} className="text-blue-400" />
    case 'image': return <Image size={14} className="text-green-400" />
    case 'web': return <Globe size={14} className="text-purple-400" />
    case 'ai': return <Sparkles size={14} className="text-yellow-400" />
    case 'youtube': return <Youtube size={14} className="text-red-400" />
    default: return null
  }
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const { boxes, selectBox, setViewport, viewport } = useCanvasStore()
  
  // Filter boxes based on search query
  const filteredBoxes = useMemo(() => {
    if (!query.trim()) return boxes
    
    const lowerQuery = query.toLowerCase()
    return boxes.filter(box => {
      const content = box.content?.toLowerCase() || ''
      const type = box.type.toLowerCase()
      return content.includes(lowerQuery) || type.includes(lowerQuery)
    })
  }, [boxes, query])
  
  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredBoxes.length])
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])
  
  // Navigate to a box
  const navigateToBox = (box: Box) => {
    selectBox(box.id)
    
    // Center the viewport on the box
    const scale = viewport.zoom / 100
    const viewportWidth = window.innerWidth * 0.7
    const viewportHeight = window.innerHeight * 0.8
    
    const centerX = -(box.x + box.width / 2) * scale + viewportWidth / 2
    const centerY = -(box.y + box.height / 2) * scale + viewportHeight / 2
    
    setViewport({ x: centerX, y: centerY })
    onClose()
  }
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filteredBoxes.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredBoxes[selectedIndex]) {
          navigateToBox(filteredBoxes[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }
  
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b border-neutral-700">
          <Search size={18} className="text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search boxes..."
            className="flex-1 bg-transparent text-neutral-100 placeholder-neutral-500 outline-none text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200"
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {filteredBoxes.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-sm">
              {query ? 'No boxes found' : 'No boxes on canvas'}
            </div>
          ) : (
            <div className="p-2">
              {filteredBoxes.map((box, index) => (
                <button
                  key={box.id}
                  onClick={() => navigateToBox(box)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${index === selectedIndex 
                      ? 'bg-blue-500/20 text-neutral-100' 
                      : 'text-neutral-300 hover:bg-neutral-700/50'
                    }
                  `}
                >
                  {getBoxIcon(box.type)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">
                      {box.content || `Untitled ${box.type}`}
                    </div>
                    <div className="text-xs text-neutral-500 capitalize">
                      {box.type} box
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-neutral-700 text-xs text-neutral-500">
          <span>{filteredBoxes.length} result{filteredBoxes.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  )
}
