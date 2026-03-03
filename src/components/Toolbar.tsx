import { 
  Type, 
  Image, 
  Globe, 
  Sparkles, 
  Youtube,
  Search,
  Settings,
  Menu
} from 'lucide-react'
import { useLayoutStore } from '../stores/layoutStore'
import { useCanvasStore } from '../stores/canvasStore'
import type { Box } from '../stores/canvasStore'

interface ToolButton {
  id: string
  icon: React.ReactNode
  label: string
  shortcut?: string
  type: Box['type']
}

export function Toolbar() {
  const { sidebarCollapsed, toggleSidebar } = useLayoutStore()
  const { addBox, viewport } = useCanvasStore()

  // Create a box at the center of the current viewport
  const createBox = (type: Box['type']) => {
    const scale = viewport.zoom / 100
    // Calculate center of viewport in canvas coordinates
    const centerX = (-viewport.x + 600) / scale // Assuming ~1200 viewport width
    const centerY = (-viewport.y + 400) / scale // Assuming ~800 viewport height
    
    // Default sizes based on box type
    const sizes: Record<Box['type'], { width: number; height: number }> = {
      text: { width: 300, height: 200 },
      image: { width: 400, height: 300 },
      web: { width: 600, height: 400 },
      ai: { width: 400, height: 300 },
      youtube: { width: 560, height: 315 },
    }
    
    const size = sizes[type]
    
    addBox({
      type,
      x: centerX - size.width / 2,
      y: centerY - size.height / 2,
      width: size.width,
      height: size.height,
      content: `New ${type} box`,
    })
  }

  const boxTools: ToolButton[] = [
    { 
      id: 'text', 
      icon: <Type size={18} />, 
      label: 'Text', 
      shortcut: 'T',
      type: 'text',
    },
    { 
      id: 'image', 
      icon: <Image size={18} />, 
      label: 'Image', 
      shortcut: 'I',
      type: 'image',
    },
    { 
      id: 'web', 
      icon: <Globe size={18} />, 
      label: 'Web', 
      shortcut: 'W',
      type: 'web',
    },
    { 
      id: 'ai', 
      icon: <Sparkles size={18} />, 
      label: 'AI', 
      shortcut: 'A',
      type: 'ai',
    },
    { 
      id: 'youtube', 
      icon: <Youtube size={18} />, 
      label: 'YouTube', 
      shortcut: 'Y',
      type: 'youtube',
    },
  ]

  return (
    <header className="flex items-center justify-between h-12 px-3 bg-neutral-900 border-b border-neutral-700">
      {/* Left section - Menu + Logo */}
      <div className="flex items-center gap-3">
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
            title="Show sidebar"
          >
            <Menu size={18} />
          </button>
        )}
        <span className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          MindJot
        </span>
      </div>

      {/* Center section - Box creation tools */}
      <div className="flex items-center gap-1 px-2 py-1 bg-neutral-800/50 rounded-lg">
        {boxTools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => createBox(tool.type)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-neutral-700 text-neutral-300 hover:text-neutral-100 transition-colors group"
            title={`Add ${tool.label} (${tool.shortcut})`}
          >
            {tool.icon}
            <span className="text-sm hidden sm:inline">{tool.label}</span>
            {tool.shortcut && (
              <kbd className="hidden lg:inline text-[10px] px-1 py-0.5 bg-neutral-700 rounded text-neutral-400 group-hover:bg-neutral-600">
                {tool.shortcut}
              </kbd>
            )}
          </button>
        ))}
      </div>

      {/* Right section - Search + Settings */}
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-colors"
          title="Search (Ctrl+K)"
        >
          <Search size={16} />
          <span className="text-sm hidden md:inline">Search</span>
          <kbd className="hidden lg:inline text-[10px] px-1 py-0.5 bg-neutral-700 rounded text-neutral-500">
            ⌘K
          </kbd>
        </button>
        <button
          className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  )
}
