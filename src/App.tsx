import { useState, useCallback } from 'react'
import { Sidebar, Toolbar, Canvas, StatusBar, KeyboardShortcutsPanel, SettingsModal, SearchModal } from './components'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import './App.css'

function App() {
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const handleOpenSettings = useCallback(() => setIsSettingsOpen(true), [])
  const handleOpenSearch = useCallback(() => setIsSearchOpen(true), [])
  const handleShowShortcuts = useCallback(() => setIsShortcutsOpen(true), [])

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    onOpenSettings: handleOpenSettings,
    onOpenSearch: handleOpenSearch,
    onShowShortcuts: handleShowShortcuts,
  })

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-neutral-950">
      {/* Top Toolbar */}
      <Toolbar 
        onOpenSettings={handleOpenSettings}
        onOpenSearch={handleOpenSearch}
      />
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />
        
        {/* Center Canvas */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <Canvas />
        </main>
      </div>
      
      {/* Bottom Status Bar */}
      <StatusBar onShowShortcuts={handleShowShortcuts} />

      {/* Modals */}
      <KeyboardShortcutsPanel 
        isOpen={isShortcutsOpen} 
        onClose={() => setIsShortcutsOpen(false)} 
      />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </div>
  )
}

export default App
