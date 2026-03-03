import { AlertTriangle, X } from 'lucide-react'
import { useSpaceStore } from '../stores/spaceStore'
import type { Space } from '../stores/spaceStore'

interface DeleteSpaceDialogProps {
  space: Space | null
  isOpen: boolean
  onClose: () => void
}

export function DeleteSpaceDialog({ space, isOpen, onClose }: DeleteSpaceDialogProps) {
  const deleteSpace = useSpaceStore((state) => state.deleteSpace)
  const spacesCount = useSpaceStore((state) => state.spaces.length)

  const handleDelete = () => {
    if (!space) return
    deleteSpace(space.id)
    onClose()
  }

  if (!isOpen || !space) return null

  const boxCount = space.boxes.length
  const isLastSpace = spacesCount === 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative bg-neutral-900 rounded-xl border border-neutral-700 shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-700">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle size={20} />
            <h2 className="text-lg font-semibold">Delete Space</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Space preview */}
          <div className="flex items-center gap-3 px-3 py-2.5 bg-neutral-800 rounded-lg border border-neutral-700 mb-4">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: space.color + '30', border: `2px solid ${space.color}` }}
            >
              {space.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-neutral-100 truncate">
                {space.name}
              </div>
              {space.description && (
                <div className="text-xs text-neutral-500 truncate">{space.description}</div>
              )}
            </div>
          </div>

          <p className="text-neutral-300 text-sm mb-3">
            Are you sure you want to delete this space? This action cannot be undone.
          </p>

          {boxCount > 0 && (
            <p className="text-amber-400 text-sm mb-3">
              ⚠️ This space contains <strong>{boxCount}</strong> {boxCount === 1 ? 'item' : 'items'} that will be permanently deleted.
            </p>
          )}

          {isLastSpace && (
            <p className="text-neutral-400 text-sm italic">
              Note: A new default space will be created since this is your last space.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
