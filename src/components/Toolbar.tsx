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

interface ToolButton {
  id: string
  icon: React.ReactNode
  label: string
  shortcut?: string
  onClick?: () => void
}

export function Toolbar() {
  const { sidebarCollapsed, toggleSidebar } = useLayoutStore()

  const boxTools: ToolButton[] = [
    { 
      id: 'text', 
      icon: <Type size={18} />, 
      label: 'Text', 
      shortcut: 'T',
      onClick: () => console.log('Add text box')
    },
    { 
      id: 'image', 
      icon: <Image size={18} />, 
      label: 'Image', 
      shortcut: 'I',
      onClick: () => console.log('Add image box')
    },
    { 
      id: 'web', 
      icon: <Globe size={18} />, 
      label: 'Web', 
      shortcut: 'W',
      onClick: () => console.log('Add web box')
    },
    { 
      id: 'ai', 
      icon: <Sparkles size={18} />, 
      label: 'AI', 
      shortcut: 'A',
      onClick: () => console.log('Add AI box')
    },
    { 
      id: 'youtube', 
      icon: <Youtube size={18} />, 
      label: 'YouTube', 
      shortcut: 'Y',
      onClick: () => console.log('Add YouTube box')
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
            onClick={tool.onClick}
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
