import { 
  Grid3X3, 
  ZoomIn, 
  ZoomOut, 
  Box, 
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useLayoutStore } from '../stores/layoutStore'

export function StatusBar() {
  const { 
    gridVisible, 
    toggleGrid, 
    zoom, 
    setZoom, 
    boxCount, 
    aiStatus 
  } = useLayoutStore()

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

  const zoomPresets = [25, 50, 75, 100, 125, 150, 200]

  return (
    <footer className="flex items-center justify-between h-8 px-3 bg-neutral-900 border-t border-neutral-700 text-xs">
      {/* Left section - Grid toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleGrid}
          className={`
            flex items-center gap-1.5 px-2 py-1 rounded transition-colors
            ${gridVisible 
              ? 'text-blue-400 hover:text-blue-300 bg-blue-400/10' 
              : 'text-neutral-500 hover:text-neutral-300'
            }
          `}
          title={gridVisible ? 'Hide grid' : 'Show grid'}
        >
          <Grid3X3 size={14} />
          <span>Grid</span>
        </button>
      </div>

      {/* Center section - Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setZoom(zoom - 10)}
          disabled={zoom <= 25}
          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        
        <div className="relative group">
          <button 
            className="w-14 text-center py-1 rounded hover:bg-neutral-800 text-neutral-300 transition-colors"
            title="Click to select zoom level"
          >
            {zoom}%
          </button>
          
          {/* Zoom dropdown */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block">
            <div className="bg-neutral-800 border border-neutral-700 rounded-md shadow-lg py-1 min-w-[80px]">
              {zoomPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setZoom(preset)}
                  className={`
                    w-full px-3 py-1 text-left hover:bg-neutral-700 transition-colors
                    ${zoom === preset ? 'text-blue-400' : 'text-neutral-300'}
                  `}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setZoom(zoom + 10)}
          disabled={zoom >= 200}
          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
      </div>

      {/* Right section - Box count + AI status */}
      <div className="flex items-center gap-4">
        {/* Box count */}
        <div className="flex items-center gap-1.5 text-neutral-500" title="Number of boxes">
          <Box size={14} />
          <span>{boxCount} {boxCount === 1 ? 'box' : 'boxes'}</span>
        </div>

        {/* AI Status */}
        <div 
          className={`flex items-center gap-1.5 ${aiDisplay.color}`}
          title={aiDisplay.text}
        >
          {aiDisplay.icon}
          <span className="hidden sm:inline">{aiDisplay.text}</span>
        </div>
      </div>
    </footer>
  )
}
