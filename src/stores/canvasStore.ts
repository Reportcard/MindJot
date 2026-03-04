import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { useSpaceStore } from './spaceStore'

// Box types
export interface Box {
  id: string
  type: 'text' | 'image' | 'web' | 'ai' | 'youtube'
  x: number
  y: number
  width: number
  height: number
  content?: string
  zIndex: number
  locked?: boolean
}

// Extended text box with rich content
export interface TextBoxData extends Box {
  type: 'text'
  content: string
  locked: boolean
}

// Extended image box with image-specific data
export interface ImageBoxData extends Box {
  type: 'image'
  imageUrl: string
  altText: string
}

// Extended web clip box with URL and metadata
export interface WebClipBoxData extends Box {
  type: 'web'
  url: string
  title?: string
  description?: string
  favicon?: string
  thumbnail?: string
  siteName?: string
}

// Extended YouTube box with video URL
export interface YouTubeBoxData extends Box {
  type: 'youtube'
  videoUrl: string
  videoId?: string
}

// Extended AI box with chat messages
export interface AIBoxData extends Box {
  type: 'ai'
  messages: AIMessage[]
}

// AI message structure
export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// Viewport state
export interface Viewport {
  x: number // Pan offset X
  y: number // Pan offset Y
  zoom: number // Zoom level (10-400)
}

// Grid settings
export interface GridSettings {
  visible: boolean
  size: number // Grid cell size in pixels
  snapToGrid: boolean
}

interface CanvasState {
  // Viewport
  viewport: Viewport
  setViewport: (viewport: Partial<Viewport>) => void
  resetViewport: () => void
  
  // Zoom
  zoomTo: (zoom: number, centerX?: number, centerY?: number) => void
  zoomIn: () => void
  zoomOut: () => void
  
  // Pan
  panBy: (deltaX: number, deltaY: number) => void
  
  // Grid
  grid: GridSettings
  setGridSize: (size: number) => void
  toggleGrid: () => void
  toggleSnapToGrid: () => void
  
  // Boxes
  boxes: Box[]
  addBox: (box: Omit<Box, 'id' | 'zIndex'>) => string
  updateBox: (id: string, updates: Partial<Box>) => void
  removeBox: (id: string) => void
  moveBox: (id: string, x: number, y: number) => void
  resizeBox: (id: string, width: number, height: number) => void
  
  // Text box specific
  addTextBox: (x: number, y: number, width?: number, height?: number, content?: string) => string
  updateTextContent: (id: string, content: string) => void
  toggleBoxLock: (id: string) => void
  
  // Image box specific
  addImageBox: (x: number, y: number, imageUrl: string, width?: number, height?: number, altText?: string) => string
  updateImageContent: (id: string, imageUrl: string, altText?: string) => void
  
  // Web clip box specific
  addWebClipBox: (x: number, y: number, url?: string, width?: number, height?: number) => string
  updateWebClipContent: (id: string, url: string, metadata?: { title?: string; description?: string; favicon?: string; thumbnail?: string; siteName?: string }) => void
  
  // YouTube box specific
  addYouTubeBox: (x: number, y: number, videoUrl?: string, width?: number, height?: number) => string
  updateYouTubeContent: (id: string, videoUrl: string) => void
  
  // AI box specific
  addAiBox: (x: number, y: number, width?: number, height?: number) => string
  updateAiBoxMessages: (id: string, messages: AIMessage[]) => void
  
  // Z-order
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
  
  // Duplicate
  duplicateBox: (id: string) => string | null
  
  // Selection
  selectedBoxId: string | null
  selectBox: (id: string | null) => void
  
  // Editing
  editingBoxId: string | null
  startEditing: (id: string) => void
  stopEditing: () => void
  
  // Space sync
  loadFromSpace: () => void
  saveToSpace: () => void
  
  // Helpers
  snapToGrid: (value: number) => number
  getVisibleBoxes: (viewportWidth: number, viewportHeight: number, buffer?: number) => Box[]
  getBoxById: (id: string) => Box | undefined
}

const MIN_ZOOM = 10
const MAX_ZOOM = 400
const ZOOM_STEP = 10
const DEFAULT_GRID_SIZE = 20

// Generate unique ID
const generateId = () => `box-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const useCanvasStore = create<CanvasState>()(
  subscribeWithSelector((set, get) => ({
    // Viewport
    viewport: { x: 0, y: 0, zoom: 100 },
    
    setViewport: (updates) => {
      set((state) => ({
        viewport: { ...state.viewport, ...updates }
      }))
      // Debounced save will happen via subscription
    },
    
    resetViewport: () => {
      set({
        viewport: { x: 0, y: 0, zoom: 100 }
      })
    },
    
    // Zoom with optional center point
    zoomTo: (zoom, centerX, centerY) => {
      const clampedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
      const state = get()
      
      if (centerX !== undefined && centerY !== undefined) {
        // Zoom towards the center point
        const oldZoom = state.viewport.zoom / 100
        const newZoom = clampedZoom / 100
        const zoomRatio = newZoom / oldZoom
        
        // Calculate new pan offset to keep the point under cursor
        const newX = centerX - (centerX - state.viewport.x) * zoomRatio
        const newY = centerY - (centerY - state.viewport.y) * zoomRatio
        
        set({
          viewport: { x: newX, y: newY, zoom: clampedZoom }
        })
      } else {
        set((state) => ({
          viewport: { ...state.viewport, zoom: clampedZoom }
        }))
      }
    },
    
    zoomIn: () => {
      const { viewport, zoomTo } = get()
      zoomTo(viewport.zoom + ZOOM_STEP)
    },
    
    zoomOut: () => {
      const { viewport, zoomTo } = get()
      zoomTo(viewport.zoom - ZOOM_STEP)
    },
    
    panBy: (deltaX, deltaY) => set((state) => ({
      viewport: {
        ...state.viewport,
        x: state.viewport.x + deltaX,
        y: state.viewport.y + deltaY
      }
    })),
    
    // Grid
    grid: {
      visible: true,
      size: DEFAULT_GRID_SIZE,
      snapToGrid: true
    },
    
    setGridSize: (size) => set((state) => ({
      grid: { ...state.grid, size: Math.max(5, Math.min(100, size)) }
    })),
    
    toggleGrid: () => set((state) => ({
      grid: { ...state.grid, visible: !state.grid.visible }
    })),
    
    toggleSnapToGrid: () => set((state) => ({
      grid: { ...state.grid, snapToGrid: !state.grid.snapToGrid }
    })),
    
    // Boxes
    boxes: [],
    
    addBox: (box) => {
      const state = get()
      const maxZIndex = state.boxes.reduce((max, b) => Math.max(max, b.zIndex), 0)
      
      // Snap position if enabled
      const x = state.grid.snapToGrid ? state.snapToGrid(box.x) : box.x
      const y = state.grid.snapToGrid ? state.snapToGrid(box.y) : box.y
      
      const id = generateId()
      const newBox: Box = {
        ...box,
        x,
        y,
        id,
        zIndex: maxZIndex + 1,
        locked: box.locked ?? false,
      }
      
      set((state) => ({
        boxes: [...state.boxes, newBox],
        selectedBoxId: newBox.id
      }))
      
      return id
    },
    
    updateBox: (id, updates) => set((state) => ({
      boxes: state.boxes.map((box) =>
        box.id === id ? { ...box, ...updates } : box
      )
    })),
    
    removeBox: (id) => set((state) => ({
      boxes: state.boxes.filter((box) => box.id !== id),
      selectedBoxId: state.selectedBoxId === id ? null : state.selectedBoxId,
      editingBoxId: state.editingBoxId === id ? null : state.editingBoxId,
    })),
    
    moveBox: (id, x, y) => {
      const state = get()
      const box = state.boxes.find(b => b.id === id)
      if (box?.locked) return
      
      const snappedX = state.grid.snapToGrid ? state.snapToGrid(x) : x
      const snappedY = state.grid.snapToGrid ? state.snapToGrid(y) : y
      
      set((state) => ({
        boxes: state.boxes.map((box) =>
          box.id === id ? { ...box, x: snappedX, y: snappedY } : box
        )
      }))
    },
    
    resizeBox: (id, width, height) => {
      const state = get()
      const box = state.boxes.find(b => b.id === id)
      if (box?.locked) return
      
      const snappedWidth = state.grid.snapToGrid 
        ? Math.max(state.grid.size, state.snapToGrid(width))
        : Math.max(20, width)
      const snappedHeight = state.grid.snapToGrid 
        ? Math.max(state.grid.size, state.snapToGrid(height))
        : Math.max(20, height)
      
      set((state) => ({
        boxes: state.boxes.map((box) =>
          box.id === id ? { ...box, width: snappedWidth, height: snappedHeight } : box
        )
      }))
    },
    
    // Text box specific methods
    addTextBox: (x, y, width = 300, height = 200, content = '') => {
      const state = get()
      const snappedX = state.grid.snapToGrid ? state.snapToGrid(x) : x
      const snappedY = state.grid.snapToGrid ? state.snapToGrid(y) : y
      const maxZIndex = state.boxes.reduce((max, b) => Math.max(max, b.zIndex), 0)
      
      const id = generateId()
      const newBox: TextBoxData = {
        id,
        type: 'text',
        x: snappedX,
        y: snappedY,
        width,
        height,
        content,
        zIndex: maxZIndex + 1,
        locked: false,
      }
      
      set((state) => ({
        boxes: [...state.boxes, newBox],
        selectedBoxId: id,
        editingBoxId: id, // Start editing immediately
      }))
      
      return id
    },
    
    updateTextContent: (id, content) => set((state) => ({
      boxes: state.boxes.map((box) =>
        box.id === id ? { ...box, content } : box
      )
    })),
    
    toggleBoxLock: (id) => set((state) => ({
      boxes: state.boxes.map((box) =>
        box.id === id ? { ...box, locked: !box.locked } : box
      )
    })),
    
    // Image box specific methods
    addImageBox: (x, y, imageUrl, width = 400, height = 300, altText = '') => {
      const state = get()
      const snappedX = state.grid.snapToGrid ? state.snapToGrid(x) : x
      const snappedY = state.grid.snapToGrid ? state.snapToGrid(y) : y
      const maxZIndex = state.boxes.reduce((max, b) => Math.max(max, b.zIndex), 0)
      
      const id = generateId()
      const newBox: ImageBoxData = {
        id,
        type: 'image',
        x: snappedX,
        y: snappedY,
        width,
        height,
        imageUrl,
        altText,
        zIndex: maxZIndex + 1,
        locked: false,
      }
      
      set((state) => ({
        boxes: [...state.boxes, newBox],
        selectedBoxId: id,
      }))
      
      return id
    },
    
    updateImageContent: (id, imageUrl, altText) => set((state) => ({
      boxes: state.boxes.map((box) =>
        box.id === id && box.type === 'image' 
          ? { ...box, imageUrl, altText: altText !== undefined ? altText : box.altText } 
          : box
      )
    })),
    
    // Web clip box specific methods
    addWebClipBox: (x, y, url = '', width = 320, height = 200) => {
      const state = get()
      const snappedX = state.grid.snapToGrid ? state.snapToGrid(x) : x
      const snappedY = state.grid.snapToGrid ? state.snapToGrid(y) : y
      const maxZIndex = state.boxes.reduce((max, b) => Math.max(max, b.zIndex), 0)
      
      const id = generateId()
      const newBox: WebClipBoxData = {
        id,
        type: 'web',
        x: snappedX,
        y: snappedY,
        width,
        height,
        url,
        zIndex: maxZIndex + 1,
        locked: false,
      }
      
      set((state) => ({
        boxes: [...state.boxes, newBox],
        selectedBoxId: id,
      }))
      
      return id
    },
    
    updateWebClipContent: (id, url, metadata) => set((state) => ({
      boxes: state.boxes.map((box) =>
        box.id === id && box.type === 'web' 
          ? { 
              ...box, 
              url,
              title: metadata?.title ?? (box as WebClipBoxData).title,
              description: metadata?.description ?? (box as WebClipBoxData).description,
              favicon: metadata?.favicon ?? (box as WebClipBoxData).favicon,
              thumbnail: metadata?.thumbnail ?? (box as WebClipBoxData).thumbnail,
              siteName: metadata?.siteName ?? (box as WebClipBoxData).siteName,
            } 
          : box
      )
    })),
    
    // YouTube box specific methods
    addYouTubeBox: (x, y, videoUrl = '', width = 560, height = 315) => {
      const state = get()
      const snappedX = state.grid.snapToGrid ? state.snapToGrid(x) : x
      const snappedY = state.grid.snapToGrid ? state.snapToGrid(y) : y
      const maxZIndex = state.boxes.reduce((max, b) => Math.max(max, b.zIndex), 0)
      
      const id = generateId()
      const newBox: YouTubeBoxData = {
        id,
        type: 'youtube',
        x: snappedX,
        y: snappedY,
        width,
        height,
        videoUrl,
        zIndex: maxZIndex + 1,
        locked: false,
      }
      
      set((state) => ({
        boxes: [...state.boxes, newBox],
        selectedBoxId: id,
      }))
      
      return id
    },
    
    updateYouTubeContent: (id, videoUrl) => set((state) => ({
      boxes: state.boxes.map((box) =>
        box.id === id && box.type === 'youtube' 
          ? { ...box, videoUrl } 
          : box
      )
    })),
    
    // AI box specific methods
    addAiBox: (x, y, width = 400, height = 300) => {
      const state = get()
      const snappedX = state.grid.snapToGrid ? state.snapToGrid(x) : x
      const snappedY = state.grid.snapToGrid ? state.snapToGrid(y) : y
      const maxZIndex = state.boxes.reduce((max, b) => Math.max(max, b.zIndex), 0)
      
      const id = generateId()
      const newBox: AIBoxData = {
        id,
        type: 'ai',
        x: snappedX,
        y: snappedY,
        width,
        height,
        messages: [],
        zIndex: maxZIndex + 1,
        locked: false,
      }
      
      set((state) => ({
        boxes: [...state.boxes, newBox],
        selectedBoxId: id,
      }))
      
      return id
    },
    
    updateAiBoxMessages: (id, messages) => set((state) => ({
      boxes: state.boxes.map((box) =>
        box.id === id && box.type === 'ai' 
          ? { ...box, messages } 
          : box
      )
    })),
    
    // Z-order management
    bringToFront: (id) => {
      const state = get()
      const maxZIndex = state.boxes.reduce((max, b) => Math.max(max, b.zIndex), 0)
      set((state) => ({
        boxes: state.boxes.map((box) =>
          box.id === id ? { ...box, zIndex: maxZIndex + 1 } : box
        )
      }))
    },
    
    sendToBack: (id) => {
      const state = get()
      const minZIndex = state.boxes.reduce((min, b) => Math.min(min, b.zIndex), Infinity)
      set((state) => ({
        boxes: state.boxes.map((box) =>
          box.id === id ? { ...box, zIndex: Math.max(0, minZIndex - 1) } : box
        )
      }))
    },
    
    // Duplicate box
    duplicateBox: (id) => {
      const state = get()
      const box = state.boxes.find(b => b.id === id)
      if (!box) return null
      
      const newId = generateId()
      const maxZIndex = state.boxes.reduce((max, b) => Math.max(max, b.zIndex), 0)
      const offset = state.grid.snapToGrid ? state.grid.size : 20
      
      const newBox: Box = {
        ...box,
        id: newId,
        x: box.x + offset,
        y: box.y + offset,
        zIndex: maxZIndex + 1,
        locked: false, // Duplicated box is unlocked
      }
      
      set((state) => ({
        boxes: [...state.boxes, newBox],
        selectedBoxId: newId,
      }))
      
      return newId
    },
    
    // Selection
    selectedBoxId: null,
    selectBox: (id) => set({ selectedBoxId: id }),
    
    // Editing
    editingBoxId: null,
    startEditing: (id) => {
      const state = get()
      const box = state.boxes.find(b => b.id === id)
      if (box?.locked) return
      
      set({ editingBoxId: id, selectedBoxId: id })
    },
    stopEditing: () => set({ editingBoxId: null }),
    
    // Space sync - load state from active space
    loadFromSpace: () => {
      const space = useSpaceStore.getState().getActiveSpace()
      if (space) {
        set({
          viewport: { ...space.viewport },
          boxes: [...space.boxes],
          selectedBoxId: space.selectedBoxId,
          editingBoxId: null,
        })
      }
    },
    
    // Space sync - save current state to active space
    saveToSpace: () => {
      const state = get()
      useSpaceStore.getState().updateActiveSpaceCanvas(
        state.viewport,
        state.boxes,
        state.selectedBoxId
      )
    },
    
    // Helpers
    snapToGrid: (value) => {
      const { grid } = get()
      return Math.round(value / grid.size) * grid.size
    },
    
    // Virtualization: only return boxes visible in viewport + buffer
    getVisibleBoxes: (viewportWidth, viewportHeight, buffer = 200) => {
      const { boxes, viewport } = get()
      const scale = viewport.zoom / 100
      
      // Calculate visible area in canvas coordinates
      const visibleLeft = -viewport.x / scale - buffer
      const visibleTop = -viewport.y / scale - buffer
      const visibleRight = (-viewport.x + viewportWidth) / scale + buffer
      const visibleBottom = (-viewport.y + viewportHeight) / scale + buffer
      
      return boxes.filter((box) => {
        const boxRight = box.x + box.width
        const boxBottom = box.y + box.height
        
        // Check if box overlaps with visible area
        return (
          box.x < visibleRight &&
          boxRight > visibleLeft &&
          box.y < visibleBottom &&
          boxBottom > visibleTop
        )
      })
    },
    
    getBoxById: (id) => {
      const { boxes } = get()
      return boxes.find(b => b.id === id)
    },
  }))
)

// Debounced auto-save to space
let saveTimeout: ReturnType<typeof setTimeout> | null = null
const debouncedSave = () => {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    useCanvasStore.getState().saveToSpace()
  }, 500) // Save 500ms after last change
}

// Track previous state for comparison
let prevState: { viewport: Viewport; boxes: Box[]; selectedBoxId: string | null } | null = null

// Subscribe to canvas changes and auto-save
useCanvasStore.subscribe((state) => {
  const currentState = { 
    viewport: state.viewport, 
    boxes: state.boxes, 
    selectedBoxId: state.selectedBoxId 
  }
  
  // Only save if state actually changed
  if (prevState && JSON.stringify(currentState) !== JSON.stringify(prevState)) {
    debouncedSave()
  }
  prevState = currentState
})

// Subscribe to space changes and reload canvas
let lastActiveSpaceId: string | null = null
useSpaceStore.subscribe((state) => {
  const activeSpaceId = state.activeSpaceId
  if (activeSpaceId && activeSpaceId !== lastActiveSpaceId) {
    lastActiveSpaceId = activeSpaceId
    // Small delay to ensure space data is available
    setTimeout(() => {
      useCanvasStore.getState().loadFromSpace()
    }, 0)
  }
})
