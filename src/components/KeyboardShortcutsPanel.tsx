import { X, Keyboard } from 'lucide-react'
import { getShortcutsByCategory, type ShortcutDefinition } from '../hooks/useKeyboardShortcuts'

// Detect if running on macOS
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

interface KeyboardShortcutsPanelProps {
  isOpen: boolean
  onClose: () => void
}

function ShortcutRow({ shortcut }: { shortcut: ShortcutDefinition }) {
  const display = isMac ? shortcut.macDisplay : shortcut.winDisplay
  
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-neutral-700/30">
      <span className="text-sm text-neutral-300">{shortcut.description}</span>
      <kbd className="px-2 py-0.5 bg-neutral-700 rounded text-xs text-neutral-200 font-mono min-w-[40px] text-center">
        {display}
      </kbd>
    </div>
  )
}

function ShortcutCategory({ title, shortcuts }: { title: string; shortcuts: ShortcutDefinition[] }) {
  if (shortcuts.length === 0) return null
  
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 px-2">
        {title}
      </h3>
      <div className="space-y-0.5">
        {shortcuts.map((shortcut) => (
          <ShortcutRow key={`${shortcut.action}-${shortcut.key}`} shortcut={shortcut} />
        ))}
      </div>
    </div>
  )
}

export function KeyboardShortcutsPanel({ isOpen, onClose }: KeyboardShortcutsPanelProps) {
  const categories = getShortcutsByCategory()
  
  if (!isOpen) return null

  const categoryTitles: Record<string, string> = {
    boxes: '📦 Create Boxes',
    editing: '✏️ Editing',
    view: '👁️ View',
    navigation: '🧭 Navigation',
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <div className="flex items-center gap-2">
            <Keyboard className="text-blue-400" size={20} />
            <h2 className="text-lg font-semibold text-neutral-100">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <div>
              <ShortcutCategory title={categoryTitles.boxes} shortcuts={categories.boxes} />
              <ShortcutCategory title={categoryTitles.editing} shortcuts={categories.editing} />
            </div>
            <div>
              <ShortcutCategory title={categoryTitles.view} shortcuts={categories.view} />
              <ShortcutCategory title={categoryTitles.navigation} shortcuts={categories.navigation} />
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-neutral-700 bg-neutral-800/50">
          <p className="text-xs text-neutral-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-neutral-700 rounded text-neutral-300">?</kbd> anytime to show this panel
          </p>
        </div>
      </div>
    </div>
  )
}
