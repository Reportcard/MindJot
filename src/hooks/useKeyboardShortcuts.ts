import { useEffect, useCallback } from 'react'
import { useCanvasStore } from '../stores/canvasStore'
import { useLayoutStore } from '../stores/layoutStore'

export interface ShortcutDefinition {
  key: string
  modifiers?: {
    ctrl?: boolean
    meta?: boolean
    shift?: boolean
    alt?: boolean
  }
  action: string
  description: string
  macDisplay: string
  winDisplay: string
  category: 'boxes' | 'editing' | 'view' | 'navigation'
}

// All keyboard shortcuts definitions
export const KEYBOARD_SHORTCUTS: ShortcutDefinition[] = [
  // Box creation
  { key: 't', action: 'newTextBox', description: 'New text box', macDisplay: 'T', winDisplay: 'T', category: 'boxes' },
  { key: 'i', action: 'newImageBox', description: 'New image box', macDisplay: 'I', winDisplay: 'I', category: 'boxes' },
  { key: 'w', action: 'newWebBox', description: 'New web clip', macDisplay: 'W', winDisplay: 'W', category: 'boxes' },
  { key: 'a', action: 'newAiBox', description: 'New AI box', macDisplay: 'A', winDisplay: 'A', category: 'boxes' },
  { key: 'y', action: 'newYoutubeBox', description: 'New YouTube', macDisplay: 'Y', winDisplay: 'Y', category: 'boxes' },
  
  // Editing
  { key: 'Delete', action: 'deleteBox', description: 'Delete box', macDisplay: 'Delete', winDisplay: 'Delete', category: 'editing' },
  { key: 'Backspace', action: 'deleteBox', description: 'Delete box', macDisplay: '⌫', winDisplay: 'Backspace', category: 'editing' },
  { key: 'd', modifiers: { ctrl: true, meta: true }, action: 'duplicate', description: 'Duplicate', macDisplay: '⌘D', winDisplay: 'Ctrl+D', category: 'editing' },
  { key: 'c', modifiers: { ctrl: true, meta: true }, action: 'copy', description: 'Copy', macDisplay: '⌘C', winDisplay: 'Ctrl+C', category: 'editing' },
  { key: 'v', modifiers: { ctrl: true, meta: true }, action: 'paste', description: 'Paste', macDisplay: '⌘V', winDisplay: 'Ctrl+V', category: 'editing' },
  { key: 'a', modifiers: { ctrl: true, meta: true }, action: 'selectAll', description: 'Select all', macDisplay: '⌘A', winDisplay: 'Ctrl+A', category: 'editing' },
  
  // View
  { key: '=', modifiers: { ctrl: true, meta: true }, action: 'zoomIn', description: 'Zoom in', macDisplay: '⌘+', winDisplay: 'Ctrl++', category: 'view' },
  { key: '+', modifiers: { ctrl: true, meta: true }, action: 'zoomIn', description: 'Zoom in', macDisplay: '⌘+', winDisplay: 'Ctrl++', category: 'view' },
  { key: '-', modifiers: { ctrl: true, meta: true }, action: 'zoomOut', description: 'Zoom out', macDisplay: '⌘-', winDisplay: 'Ctrl+-', category: 'view' },
  { key: '0', modifiers: { ctrl: true, meta: true }, action: 'resetZoom', description: 'Reset zoom', macDisplay: '⌘0', winDisplay: 'Ctrl+0', category: 'view' },
  { key: 'g', modifiers: { ctrl: true, meta: true }, action: 'toggleGrid', description: 'Toggle grid', macDisplay: '⌘G', winDisplay: 'Ctrl+G', category: 'view' },
  { key: '\\', modifiers: { ctrl: true, meta: true }, action: 'toggleSidebar', description: 'Toggle sidebar', macDisplay: '⌘\\', winDisplay: 'Ctrl+\\', category: 'view' },
  
  // Navigation
  { key: ',', modifiers: { ctrl: true, meta: true }, action: 'openSettings', description: 'Settings', macDisplay: '⌘,', winDisplay: 'Ctrl+,', category: 'navigation' },
  { key: 'f', modifiers: { ctrl: true, meta: true }, action: 'openSearch', description: 'Search', macDisplay: '⌘F', winDisplay: 'Ctrl+F', category: 'navigation' },
  { key: '?', action: 'showShortcuts', description: 'Keyboard shortcuts', macDisplay: '?', winDisplay: '?', category: 'navigation' },
  { key: 'Escape', action: 'escape', description: 'Cancel/Deselect', macDisplay: 'Esc', winDisplay: 'Esc', category: 'navigation' },
]

// Detect if running on macOS
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)

interface UseKeyboardShortcutsOptions {
  onOpenSettings?: () => void
  onOpenSearch?: () => void
  onShowShortcuts?: () => void
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const {
    viewport,
    zoomTo,
    resetViewport,
    selectedBoxId,
    selectBox,
    editingBoxId,
    stopEditing,
    startEditing,
    removeBox,
    duplicateBox,
    addTextBox,
    addImageBox,
    addWebClipBox,
    addAiBox,
    addBox,
    boxes,
    toggleGrid,
  } = useCanvasStore()
  
  const { toggleSidebar } = useLayoutStore()

  // Calculate viewport center in canvas coordinates
  const getViewportCenter = useCallback(() => {
    const scale = viewport.zoom / 100
    // Estimate viewport dimensions (will be accurate when component knows actual size)
    const viewportWidth = window.innerWidth * 0.7 // Approximate canvas width
    const viewportHeight = window.innerHeight * 0.8 // Approximate canvas height
    return {
      x: (-viewport.x + viewportWidth / 2) / scale,
      y: (-viewport.y + viewportHeight / 2) / scale,
    }
  }, [viewport])

  // Box creation helper
  const createBox = useCallback((type: 'text' | 'image' | 'web' | 'ai' | 'youtube') => {
    const center = getViewportCenter()
    
    const sizes: Record<string, { width: number; height: number }> = {
      text: { width: 300, height: 200 },
      image: { width: 400, height: 300 },
      web: { width: 320, height: 200 },
      ai: { width: 400, height: 300 },
      youtube: { width: 560, height: 315 },
    }
    
    const size = sizes[type]
    
    if (type === 'text') {
      addTextBox(center.x - size.width / 2, center.y - size.height / 2)
    } else if (type === 'image') {
      addImageBox(center.x - size.width / 2, center.y - size.height / 2, '', size.width, size.height)
    } else if (type === 'web') {
      addWebClipBox(center.x - size.width / 2, center.y - size.height / 2)
    } else if (type === 'ai') {
      addAiBox(center.x - size.width / 2, center.y - size.height / 2, size.width, size.height)
    } else {
      addBox({
        type,
        x: center.x - size.width / 2,
        y: center.y - size.height / 2,
        width: size.width,
        height: size.height,
        content: `New ${type} box`,
      })
    }
  }, [getViewportCenter, addTextBox, addImageBox, addWebClipBox, addAiBox, addBox])

  // Clipboard state for copy/paste
  const clipboardRef = { current: null as string | null }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't handle shortcuts when typing in inputs (unless it's contentEditable for text boxes)
    const target = e.target as HTMLElement
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      return
    }
    
    // If editing a text box, only handle escape
    if (editingBoxId) {
      if (e.key === 'Escape') {
        e.preventDefault()
        stopEditing()
      }
      return
    }

    const isMod = isMac ? e.metaKey : e.ctrlKey
    const key = e.key.toLowerCase()

    // Box creation shortcuts (no modifier)
    if (!isMod && !e.altKey && !e.shiftKey) {
      switch (key) {
        case 't':
          e.preventDefault()
          createBox('text')
          return
        case 'i':
          e.preventDefault()
          createBox('image')
          return
        case 'w':
          e.preventDefault()
          createBox('web')
          return
        case 'a':
          e.preventDefault()
          createBox('ai')
          return
        case 'y':
          e.preventDefault()
          createBox('youtube')
          return
        case '?':
          e.preventDefault()
          options.onShowShortcuts?.()
          return
        case 'escape':
          e.preventDefault()
          selectBox(null)
          return
        case 'enter':
          // Enter to start editing selected text box
          if (selectedBoxId) {
            const box = boxes.find(b => b.id === selectedBoxId)
            if (box?.type === 'text' && !box.locked) {
              e.preventDefault()
              startEditing(selectedBoxId)
            }
          }
          return
      }
    }

    // Delete/Backspace - delete selected box
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBoxId && !isMod) {
      e.preventDefault()
      removeBox(selectedBoxId)
      return
    }

    // Modifier shortcuts
    if (isMod) {
      switch (key) {
        // Zoom
        case '=':
        case '+':
          e.preventDefault()
          zoomTo(viewport.zoom + 10)
          return
        case '-':
          e.preventDefault()
          zoomTo(viewport.zoom - 10)
          return
        case '0':
          e.preventDefault()
          resetViewport()
          return
          
        // Editing
        case 'd':
          if (selectedBoxId) {
            e.preventDefault()
            duplicateBox(selectedBoxId)
          }
          return
        case 'c':
          if (selectedBoxId) {
            e.preventDefault()
            clipboardRef.current = selectedBoxId
          }
          return
        case 'v':
          if (clipboardRef.current) {
            e.preventDefault()
            duplicateBox(clipboardRef.current)
          }
          return
        case 'a':
          e.preventDefault()
          // Select all boxes - select the first one for now (multi-select can be added later)
          if (boxes.length > 0) {
            selectBox(boxes[0].id)
          }
          return
          
        // View toggles
        case 'g':
          e.preventDefault()
          toggleGrid()
          return
        case '\\':
          e.preventDefault()
          toggleSidebar()
          return
          
        // Navigation
        case ',':
          e.preventDefault()
          options.onOpenSettings?.()
          return
        case 'f':
          e.preventDefault()
          options.onOpenSearch?.()
          return
      }
    }
  }, [
    editingBoxId, 
    stopEditing, 
    startEditing,
    selectedBoxId, 
    selectBox, 
    removeBox, 
    duplicateBox, 
    createBox,
    viewport.zoom, 
    zoomTo, 
    resetViewport,
    toggleGrid,
    toggleSidebar,
    boxes,
    options,
  ])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    shortcuts: KEYBOARD_SHORTCUTS,
    isMac,
  }
}

// Helper to get display string for a shortcut
export function getShortcutDisplay(shortcut: ShortcutDefinition): string {
  return isMac ? shortcut.macDisplay : shortcut.winDisplay
}

// Group shortcuts by category
export function getShortcutsByCategory(): Record<string, ShortcutDefinition[]> {
  const categories: Record<string, ShortcutDefinition[]> = {
    boxes: [],
    editing: [],
    view: [],
    navigation: [],
  }
  
  // Filter out duplicate entries (like Delete/Backspace)
  const seen = new Set<string>()
  
  for (const shortcut of KEYBOARD_SHORTCUTS) {
    const key = `${shortcut.action}-${shortcut.category}`
    if (!seen.has(key)) {
      seen.add(key)
      categories[shortcut.category].push(shortcut)
    }
  }
  
  return categories
}
