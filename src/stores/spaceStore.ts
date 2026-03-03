import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Box, Viewport } from './canvasStore'

// Space color presets
export const SPACE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
] as const

// Space icons (emoji-based for simplicity)
export const SPACE_ICONS = [
  '📁', '📝', '💡', '🎯', '🚀', '📚', '🔬', '🎨', 
  '💼', '🏠', '⭐', '🔧', '📊', '🎵', '🌍', '🧠'
] as const

export interface Space {
  id: string
  name: string
  description?: string
  color: string
  icon: string
  createdAt: number
  updatedAt: number
  // Canvas state for this space
  viewport: Viewport
  boxes: Box[]
  selectedBoxId: string | null
}

interface SpaceState {
  spaces: Space[]
  activeSpaceId: string | null
  
  // Space CRUD
  createSpace: (name: string, description?: string, color?: string, icon?: string) => string
  updateSpace: (id: string, updates: Partial<Pick<Space, 'name' | 'description' | 'color' | 'icon'>>) => void
  deleteSpace: (id: string) => void
  
  // Space switching
  switchSpace: (id: string) => void
  getActiveSpace: () => Space | null
  
  // Canvas state for active space
  updateActiveSpaceCanvas: (viewport: Viewport, boxes: Box[], selectedBoxId: string | null) => void
  
  // Export
  exportSpace: (id: string) => string | null
  exportAllSpaces: () => string
  
  // Initialize with default space
  ensureDefaultSpace: () => void
}

// Generate unique ID
const generateId = () => `space-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Create default "Welcome" space
const createDefaultSpace = (): Space => ({
  id: 'welcome',
  name: 'Welcome',
  description: 'Your first workspace - start creating!',
  color: SPACE_COLORS[0],
  icon: '🏠',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  viewport: { x: 0, y: 0, zoom: 100 },
  boxes: [],
  selectedBoxId: null,
})

export const useSpaceStore = create<SpaceState>()(
  persist(
    (set, get) => ({
      spaces: [],
      activeSpaceId: null,

      createSpace: (name, description, color, icon) => {
        const id = generateId()
        const newSpace: Space = {
          id,
          name: name.trim() || 'Untitled Space',
          description: description?.trim(),
          color: color || SPACE_COLORS[Math.floor(Math.random() * SPACE_COLORS.length)],
          icon: icon || SPACE_ICONS[Math.floor(Math.random() * SPACE_ICONS.length)],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          viewport: { x: 0, y: 0, zoom: 100 },
          boxes: [],
          selectedBoxId: null,
        }

        set((state) => ({
          spaces: [...state.spaces, newSpace],
          activeSpaceId: id, // Auto-switch to new space
        }))

        return id
      },

      updateSpace: (id, updates) => {
        set((state) => ({
          spaces: state.spaces.map((space) =>
            space.id === id
              ? { ...space, ...updates, updatedAt: Date.now() }
              : space
          ),
        }))
      },

      deleteSpace: (id) => {
        const state = get()
        const remainingSpaces = state.spaces.filter((s) => s.id !== id)
        
        // If deleting active space, switch to another
        let newActiveId = state.activeSpaceId
        if (state.activeSpaceId === id) {
          newActiveId = remainingSpaces.length > 0 ? remainingSpaces[0].id : null
        }

        set({
          spaces: remainingSpaces,
          activeSpaceId: newActiveId,
        })

        // Ensure at least default space exists
        if (remainingSpaces.length === 0) {
          get().ensureDefaultSpace()
        }
      },

      switchSpace: (id) => {
        const state = get()
        const space = state.spaces.find((s) => s.id === id)
        if (!space) return

        set({ activeSpaceId: id })
      },

      getActiveSpace: () => {
        const state = get()
        return state.spaces.find((s) => s.id === state.activeSpaceId) || null
      },

      updateActiveSpaceCanvas: (viewport, boxes, selectedBoxId) => {
        const state = get()
        if (!state.activeSpaceId) return

        set((state) => ({
          spaces: state.spaces.map((space) =>
            space.id === state.activeSpaceId
              ? { ...space, viewport, boxes, selectedBoxId, updatedAt: Date.now() }
              : space
          ),
        }))
      },

      exportSpace: (id) => {
        const space = get().spaces.find((s) => s.id === id)
        if (!space) return null

        const exportData = {
          version: 1,
          exportedAt: new Date().toISOString(),
          type: 'single-space',
          space: {
            name: space.name,
            description: space.description,
            color: space.color,
            icon: space.icon,
            viewport: space.viewport,
            boxes: space.boxes,
          },
        }

        return JSON.stringify(exportData, null, 2)
      },

      exportAllSpaces: () => {
        const { spaces } = get()
        
        const exportData = {
          version: 1,
          exportedAt: new Date().toISOString(),
          type: 'all-spaces',
          spaces: spaces.map((space) => ({
            name: space.name,
            description: space.description,
            color: space.color,
            icon: space.icon,
            viewport: space.viewport,
            boxes: space.boxes,
          })),
        }

        return JSON.stringify(exportData, null, 2)
      },

      ensureDefaultSpace: () => {
        const state = get()
        if (state.spaces.length === 0) {
          const defaultSpace = createDefaultSpace()
          set({
            spaces: [defaultSpace],
            activeSpaceId: defaultSpace.id,
          })
        } else if (!state.activeSpaceId) {
          set({ activeSpaceId: state.spaces[0].id })
        }
      },
    }),
    {
      name: 'mindjot-spaces',
      version: 1,
    }
  )
)
