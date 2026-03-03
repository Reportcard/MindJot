import { create } from 'zustand'

interface LayoutState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  
  // Canvas
  zoom: number
  setZoom: (zoom: number) => void
  gridVisible: boolean
  toggleGrid: () => void
  
  // Boxes
  boxCount: number
  setBoxCount: (count: number) => void
  
  // AI Status
  aiStatus: 'idle' | 'thinking' | 'connected' | 'error'
  setAiStatus: (status: 'idle' | 'thinking' | 'connected' | 'error') => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  // Canvas
  zoom: 100,
  setZoom: (zoom) => set({ zoom: Math.min(200, Math.max(25, zoom)) }),
  gridVisible: true,
  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
  
  // Boxes
  boxCount: 0,
  setBoxCount: (count) => set({ boxCount: count }),
  
  // AI Status
  aiStatus: 'idle',
  setAiStatus: (status) => set({ aiStatus: status }),
}))
