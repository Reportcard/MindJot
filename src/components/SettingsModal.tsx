import { useState } from 'react'
import { X, Settings, Keyboard, Grid3X3, Monitor } from 'lucide-react'
import { useCanvasStore } from '../stores/canvasStore'
import { getShortcutsByCategory, type ShortcutDefinition } from '../hooks/useKeyboardShortcuts'

// Detect if running on macOS
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsTab = 'general' | 'shortcuts' | 'canvas'

function ShortcutRow({ shortcut }: { shortcut: ShortcutDefinition }) {
  const display = isMac ? shortcut.macDisplay : shortcut.winDisplay
  
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-neutral-300">{shortcut.description}</span>
      <kbd className="px-2 py-0.5 bg-neutral-700 rounded text-xs text-neutral-200 font-mono">
        {display}
      </kbd>
    </div>
  )
}

function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-neutral-200 mb-3">About</h3>
        <div className="bg-neutral-800/50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold">M</span>
            </div>
            <div>
              <h4 className="font-semibold text-neutral-100">MindJot</h4>
              <p className="text-xs text-neutral-400">Version 1.0.0</p>
            </div>
          </div>
          <p className="text-sm text-neutral-400">
            An infinite canvas for your thoughts, ideas, and creativity.
          </p>
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-neutral-200 mb-3">Platform</h3>
        <div className="flex items-center gap-2 text-sm text-neutral-400">
          <Monitor size={16} />
          <span>{isMac ? 'macOS' : navigator.platform.includes('Win') ? 'Windows' : 'Linux'}</span>
        </div>
      </div>
    </div>
  )
}

function ShortcutsSettings() {
  const categories = getShortcutsByCategory()
  
  const categoryTitles: Record<string, string> = {
    boxes: 'Create Boxes',
    editing: 'Editing',
    view: 'View',
    navigation: 'Navigation',
  }

  return (
    <div className="space-y-6">
      {Object.entries(categories).map(([category, shortcuts]) => (
        <div key={category}>
          <h3 className="text-sm font-medium text-neutral-200 mb-2">
            {categoryTitles[category]}
          </h3>
          <div className="bg-neutral-800/50 rounded-lg p-3 space-y-1">
            {shortcuts.map((shortcut) => (
              <ShortcutRow key={`${shortcut.action}-${shortcut.key}`} shortcut={shortcut} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function CanvasSettings() {
  const { grid, setGridSize, toggleGrid, toggleSnapToGrid } = useCanvasStore()
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-neutral-200 mb-3">Grid</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm text-neutral-300">Show grid</span>
            <button
              onClick={toggleGrid}
              className={`
                relative w-10 h-6 rounded-full transition-colors
                ${grid.visible ? 'bg-blue-500' : 'bg-neutral-600'}
              `}
            >
              <span
                className={`
                  absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                  ${grid.visible ? 'left-5' : 'left-1'}
                `}
              />
            </button>
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-sm text-neutral-300">Snap to grid</span>
            <button
              onClick={toggleSnapToGrid}
              className={`
                relative w-10 h-6 rounded-full transition-colors
                ${grid.snapToGrid ? 'bg-blue-500' : 'bg-neutral-600'}
              `}
            >
              <span
                className={`
                  absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                  ${grid.snapToGrid ? 'left-5' : 'left-1'}
                `}
              />
            </button>
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-sm text-neutral-300">Grid size</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="5"
                max="50"
                value={grid.size}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-24 accent-blue-500"
              />
              <span className="text-xs text-neutral-400 w-8">{grid.size}px</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  
  if (!isOpen) return null

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General', icon: <Settings size={16} /> },
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard size={16} /> },
    { id: 'canvas', label: 'Canvas', icon: <Grid3X3 size={16} /> },
  ]

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-48 bg-neutral-800/50 border-r border-neutral-700 p-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-100">Settings</h2>
          </div>
          
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors
                  ${activeTab === tab.id 
                    ? 'bg-neutral-700 text-neutral-100' 
                    : 'text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-neutral-700">
            <h3 className="text-md font-medium text-neutral-200">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'shortcuts' && <ShortcutsSettings />}
            {activeTab === 'canvas' && <CanvasSettings />}
          </div>
        </div>
      </div>
    </div>
  )
}
