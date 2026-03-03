import { create } from 'zustand'

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
  addBox: (box: Omit<Box, 'id' | 'zIndex'>) => void
  updateBox: (id: string, updates: Partial<Box>) => void
  removeBox: (id: string) => void
  moveBox: (id: string, x: number, y: number) => void
  resizeBox: (id: string, width: number, height: number) => void
  
  // Selection
  selectedBoxId: string | null
  selectBox: (id: string | null) => void
  
  // Helpers
  snapToGrid: (value: number) => number
  getVisibleBoxes: (viewportWidth: number, viewportHeight: number, buffer?: number) => Box[]
}

const MIN_ZOOM = 10
const MAX_ZOOM = 400
const ZOOM_STEP = 10
const DEFAULT_GRID_SIZE = 20

// Generate unique ID
const generateId = () => `box-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const useCanvasStore = create<CanvasState>((set, get) => ({
  // Viewport
  viewport: { x: 0, y: 0, zoom: 100 },
  
  setViewport: (updates) => set((state) => ({
    viewport: { ...state.viewport, ...updates }
  })),
  
  resetViewport: () => set({
    viewport: { x: 0, y: 0, zoom: 100 }
  }),
  
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
    
    const newBox: Box = {
      ...box,
      x,
      y,
      id: generateId(),
      zIndex: maxZIndex + 1
    }
    
    set((state) => ({
      boxes: [...state.boxes, newBox],
      selectedBoxId: newBox.id
    }))
  },
  
  updateBox: (id, updates) => set((state) => ({
    boxes: state.boxes.map((box) =>
      box.id === id ? { ...box, ...updates } : box
    )
  })),
  
  removeBox: (id) => set((state) => ({
    boxes: state.boxes.filter((box) => box.id !== id),
    selectedBoxId: state.selectedBoxId === id ? null : state.selectedBoxId
  })),
  
  moveBox: (id, x, y) => {
    const state = get()
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
  
  // Selection
  selectedBoxId: null,
  selectBox: (id) => set({ selectedBoxId: id }),
  
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
  }
}))
