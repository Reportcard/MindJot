import { 
  Grid3X3, 
  ZoomIn, 
  ZoomOut, 
  Box, 
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Magnet,
  Keyboard
} from 'lucide-react'
import { useLayoutStore } from '../stores/layoutStore'
import { useCanvasStore } from '../stores/canvasStore'

interface StatusBarProps {
  onShowShortcuts?: () => void
}

export function StatusBar({ onShowShortcuts }: StatusBarProps) {
  const { aiStatus } = useLayoutStore()
  
  const { 
    viewport,
    zoomTo,
    grid,
    toggleGrid,
    toggleSnapToGrid,
    setGridSize,
    boxes,
  } = useCanvasStore()

  const getAiStatusDisplay = () => {
    switch (aiStatus) {
      case 'thinking':
        return {
          icon: <Loader2 size={14} className="animate-spin" />,
          text: 'AI Thinking...',
          color: 'text-blue-400'
        }
      case 'connected':
        return {
          icon: <CheckCircle2 size={14} />,
          text: 'AI Connected',
          color: 'text-green-400'
        }
      case 'error':
        return {
          icon: <AlertCircle size={14} />,
          text: 'AI Error',
          color: 'text-red-400'
        }
      default:
        return {
          icon: <Sparkles size={14} />,
          text: 'AI Ready',
          color: 'text-neutral-500'
        }
    }
  }

  const aiDisplay = getAiStatusDisplay()

  const zoomPresets = [10, 25, 50, 75, 100, 125, 150, 200, 300, 400]
  const gridSizePresets = [10, 20, 40, 50, 100]

  return (
    <footer className="flex items-center justify-between h-8 px-3 bg-neutral-900 border-t border-neutral-700 text-xs">
      {/* Left section - Grid controls */}
      <div className="flex items-center gap-2">
        {/* Grid toggle */}
        <button
          onClick={toggleGrid}
          className={`
            flex items-center gap-1.5 px-2 py-1 rounded transition-colors
            ${grid.visible 
              ? 'text-blue-400 hover:text-blue-300 bg-blue-400/10' 
              : 'text-neutral-500 hover:text-neutral-300'
            }
          `}
          title={grid.visible ? 'Hide grid' : 'Show grid'}
        >
          <Grid3X3 size={14} />
          <span>Grid</span>
        </button>

        {/* Snap to grid toggle */}
        <button
          onClick={toggleSnapToGrid}
          className={`
            flex items-center gap-1.5 px-2 py-1 rounded transition-colors
            ${grid.snapToGrid 
              ? 'text-green-400 hover:text-green-300 bg-green-400/10' 
              : 'text-neutral-500 hover:text-neutral-300'
            }
          `}
          title={grid.snapToGrid ? 'Disable snap to grid' : 'Enable snap to grid'}
        >
          <Magnet size={14} />
          <span>Snap</span>
        </button>

        {/* Grid size selector */}
        <div className="relative group">
          <button 
            className="px-2 py-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
            title="Grid size"
          >
            {grid.size}px
          </button>
          
          {/* Grid size dropdown */}
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50">
            <div className="bg-neutral-800 border border-neutral-700 rounded-md shadow-lg py-1 min-w-[70px]">
              {gridSizePresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setGridSize(preset)}
                  className={`
                    w-full px-3 py-1 text-left hover:bg-neutral-700 transition-colors
                    ${grid.size === preset ? 'text-blue-400' : 'text-neutral-300'}
                  `}
                >
                  {preset}px
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Center section - Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => zoomTo(viewport.zoom - 10)}
          disabled={viewport.zoom <= 10}
          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Zoom out (Ctrl+-)"
        >
          <ZoomOut size={14} />
        </button>
        
        <div className="relative group">
          <button 
            className="w-16 text-center py-1 rounded hover:bg-neutral-800 text-neutral-300 transition-colors"
            title="Click to select zoom level"
          >
            {viewport.zoom}%
          </button>
          
          {/* Zoom dropdown */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-50">
            <div className="bg-neutral-800 border border-neutral-700 rounded-md shadow-lg py-1 min-w-[80px] max-h-48 overflow-y-auto">
              {zoomPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => zoomTo(preset)}
                  className={`
                    w-full px-3 py-1 text-left hover:bg-neutral-700 transition-colors
                    ${viewport.zoom === preset ? 'text-blue-400' : 'text-neutral-300'}
                  `}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => zoomTo(viewport.zoom + 10)}
          disabled={viewport.zoom >= 400}
          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Zoom in (Ctrl++)"
        >
          <ZoomIn size={14} />
        </button>
        
        {/* Reset zoom button */}
        <button
          onClick={() => zoomTo(100)}
          className={`
            px-2 py-1 rounded text-xs transition-colors
            ${viewport.zoom !== 100 
              ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-400/10' 
              : 'text-neutral-600 cursor-default'
            }
          `}
          title="Reset zoom (Ctrl+0)"
          disabled={viewport.zoom === 100}
        >
          Reset
        </button>
      </div>

      {/* Right section - Box count + AI status + Shortcuts */}
      <div className="flex items-center gap-4">
        {/* Box count */}
        <div className="flex items-center gap-1.5 text-neutral-500" title="Number of boxes">
          <Box size={14} />
          <span>{boxes.length} {boxes.length === 1 ? 'box' : 'boxes'}</span>
        </div>

        {/* AI Status */}
        <div 
          className={`flex items-center gap-1.5 ${aiDisplay.color}`}
          title={aiDisplay.text}
        >
          {aiDisplay.icon}
          <span className="hidden sm:inline">{aiDisplay.text}</span>
        </div>

        {/* Keyboard shortcuts button */}
        <button
          onClick={onShowShortcuts}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard size={14} />
          <span className="hidden sm:inline">?</span>
        </button>
      </div>
    </footer>
  )
}
