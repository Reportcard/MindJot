import { useState } from 'react'
import { X } from 'lucide-react'
import { useSpaceStore, SPACE_COLORS, SPACE_ICONS } from '../stores/spaceStore'

interface CreateSpaceDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateSpaceDialog({ isOpen, onClose }: CreateSpaceDialogProps) {
  const createSpace = useSpaceStore((state) => state.createSpace)
  
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>(SPACE_COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState<string>(SPACE_ICONS[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    createSpace(name, description, selectedColor, selectedIcon)
    
    // Reset form
    setName('')
    setDescription('')
    setSelectedColor(SPACE_COLORS[0])
    setSelectedIcon(SPACE_ICONS[0])
    onClose()
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-neutral-900 rounded-xl border border-neutral-700 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-100">Create New Space</h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="space-name" className="block text-sm font-medium text-neutral-300 mb-2">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="space-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workspace"
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="space-description" className="block text-sm font-medium text-neutral-300 mb-2">
              Description <span className="text-neutral-500">(optional)</span>
            </label>
            <textarea
              id="space-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of this space..."
              rows={2}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Icon selector */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {SPACE_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`
                    w-9 h-9 flex items-center justify-center rounded-lg text-lg
                    transition-all
                    ${selectedIcon === icon 
                      ? 'bg-neutral-700 ring-2 ring-blue-500' 
                      : 'bg-neutral-800 hover:bg-neutral-700'
                    }
                  `}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Color selector */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {SPACE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`
                    w-8 h-8 rounded-full transition-all
                    ${selectedColor === color 
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-110' 
                      : 'hover:scale-105'
                    }
                  `}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="pt-2">
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Preview
            </label>
            <div className="flex items-center gap-3 px-3 py-2.5 bg-neutral-800 rounded-lg border border-neutral-700">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                style={{ backgroundColor: selectedColor + '30', border: `2px solid ${selectedColor}` }}
              >
                {selectedIcon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-neutral-100 truncate">
                  {name || 'Untitled Space'}
                </div>
                {description && (
                  <div className="text-xs text-neutral-500 truncate">{description}</div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded-lg font-medium transition-colors"
            >
              Create Space
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
