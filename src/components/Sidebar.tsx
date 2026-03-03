import { 
  ChevronLeft, 
  ChevronRight, 
  FolderOpen, 
  Plus, 
  Star,
  Clock,
  Trash2
} from 'lucide-react'
import { useLayoutStore } from '../stores/layoutStore'

interface Space {
  id: string
  name: string
  icon?: string
}

// Mock data for now
const mockSpaces: Space[] = [
  { id: '1', name: 'Personal Notes' },
  { id: '2', name: 'Work Projects' },
  { id: '3', name: 'Research' },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useLayoutStore()

  return (
    <aside
      className={`
        relative flex flex-col bg-neutral-900 border-r border-neutral-700
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-12' : 'w-64'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-700">
        {!sidebarCollapsed && (
          <span className="font-semibold text-neutral-200">Spaces</span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Quick Actions */}
      {!sidebarCollapsed && (
        <div className="p-2 border-b border-neutral-700">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 transition-colors">
            <Plus size={16} />
            <span className="text-sm">New Space</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* Starred */}
        {!sidebarCollapsed && (
          <div className="mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
              <Star size={12} />
              Starred
            </div>
            <div className="text-sm text-neutral-500 px-3 py-2">
              No starred spaces
            </div>
          </div>
        )}

        {/* Recent */}
        {!sidebarCollapsed && (
          <div className="mb-4">
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wider">
              <Clock size={12} />
              Recent
            </div>
            {mockSpaces.map((space) => (
              <button
                key={space.id}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 transition-colors text-left"
              >
                <FolderOpen size={16} className="text-neutral-500" />
                <span className="text-sm truncate">{space.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Collapsed icons */}
        {sidebarCollapsed && (
          <div className="flex flex-col items-center gap-2">
            <button
              className="p-2 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
              title="New Space"
            >
              <Plus size={18} />
            </button>
            <button
              className="p-2 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Starred"
            >
              <Star size={18} />
            </button>
            <button
              className="p-2 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Recent"
            >
              <Clock size={18} />
            </button>
          </div>
        )}
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="p-2 border-t border-neutral-700">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-300 transition-colors">
            <Trash2 size={16} />
            <span className="text-sm">Trash</span>
          </button>
        </div>
      )}
    </aside>
  )
}
