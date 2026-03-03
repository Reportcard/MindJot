import { create } from 'zustand'

interface LayoutState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  
  // Canvas (legacy - kept for compatibility, real state in canvasStore)
  zoom: number
  setZoom: (zoom: number) => void
  gridVisible: boolean
  toggleGrid: () => void
  
  // Boxes (legacy - kept for compatibility)
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
  
  // Canvas (legacy compatibility)
  zoom: 100,
  setZoom: (zoom) => set({ zoom: Math.min(400, Math.max(10, zoom)) }),
  gridVisible: true,
  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
  
  // Boxes (legacy)
  boxCount: 0,
  setBoxCount: (count) => set({ boxCount: count }),
  
  // AI Status
  aiStatus: 'idle',
  setAiStatus: (status) => set({ aiStatus: status }),
}))
