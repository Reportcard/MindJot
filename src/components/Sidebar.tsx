import { useState, useEffect } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Download,
  Trash2,
  MoreHorizontal
} from 'lucide-react'
import { useLayoutStore } from '../stores/layoutStore'
import { useSpaceStore } from '../stores/spaceStore'
import type { Space } from '../stores/spaceStore'
import { CreateSpaceDialog } from './CreateSpaceDialog'
import { DeleteSpaceDialog } from './DeleteSpaceDialog'

interface SpaceContextMenuProps {
  position: { x: number; y: number }
  onClose: () => void
  onDelete: () => void
  onExport: () => void
}

function SpaceContextMenu({ position, onClose, onDelete, onExport }: SpaceContextMenuProps) {
  useEffect(() => {
    const handleClick = () => onClose()
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      className="fixed z-50 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors"
        onClick={onExport}
      >
        <Download size={14} />
        Export Space
      </button>
      <div className="h-px bg-neutral-700 my-1" />
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
        onClick={onDelete}
      >
        <Trash2 size={14} />
        Delete Space
      </button>
    </div>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useLayoutStore()
  const { spaces, activeSpaceId, switchSpace, exportSpace, ensureDefaultSpace } = useSpaceStore()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [deleteDialogSpace, setDeleteDialogSpace] = useState<Space | null>(null)
  const [contextMenu, setContextMenu] = useState<{ space: Space; position: { x: number; y: number } } | null>(null)

  // Ensure default space exists on mount
  useEffect(() => {
    ensureDefaultSpace()
  }, [ensureDefaultSpace])

  const handleSpaceClick = (spaceId: string) => {
    switchSpace(spaceId)
  }

  const handleContextMenu = (e: React.MouseEvent, space: Space) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      space,
      position: { x: e.clientX, y: e.clientY }
    })
  }

  const handleMoreClick = (e: React.MouseEvent, space: Space) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setContextMenu({
      space,
      position: { x: rect.right, y: rect.top }
    })
  }

  const handleExport = (space: Space) => {
    const data = exportSpace(space.id)
    if (!data) return

    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${space.name.toLowerCase().replace(/\s+/g, '-')}-export.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setContextMenu(null)
  }

  // Sort spaces: active first, then by updatedAt
  const sortedSpaces = [...spaces].sort((a, b) => {
    if (a.id === activeSpaceId) return -1
    if (b.id === activeSpaceId) return 1
    return b.updatedAt - a.updatedAt
  })

  return (
    <>
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

        {/* New Space Button */}
        {!sidebarCollapsed && (
          <div className="p-2 border-b border-neutral-700">
            <button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-800 text-neutral-300 hover:text-neutral-100 transition-colors"
            >
              <Plus size={16} />
              <span className="text-sm">New Space</span>
            </button>
          </div>
        )}

        {/* Spaces List */}
        <nav className="flex-1 overflow-y-auto p-2">
          {!sidebarCollapsed ? (
            <div className="space-y-1">
              {sortedSpaces.map((space) => (
                <button
                  key={space.id}
                  onClick={() => handleSpaceClick(space.id)}
                  onContextMenu={(e) => handleContextMenu(e, space)}
                  className={`
                    w-full flex items-center gap-2 px-2 py-2 rounded-md text-left
                    transition-all duration-150 group
                    ${space.id === activeSpaceId 
                      ? 'bg-neutral-800 text-neutral-100' 
                      : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
                    }
                  `}
                >
                  {/* Space icon with color */}
                  <div 
                    className="w-7 h-7 rounded-md flex items-center justify-center text-sm flex-shrink-0"
                    style={{ 
                      backgroundColor: space.color + '25',
                      border: space.id === activeSpaceId ? `2px solid ${space.color}` : `1px solid ${space.color}50`
                    }}
                  >
                    {space.icon}
                  </div>
                  
                  {/* Space name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{space.name}</div>
                    {space.description && (
                      <div className="text-xs text-neutral-500 truncate">{space.description}</div>
                    )}
                  </div>

                  {/* More button */}
                  <button
                    onClick={(e) => handleMoreClick(e, space)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 transition-all"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </button>
              ))}
            </div>
          ) : (
            /* Collapsed view */
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setIsCreateDialogOpen(true)}
                className="p-2 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                title="New Space"
              >
                <Plus size={18} />
              </button>
              <div className="h-px w-6 bg-neutral-700" />
              {sortedSpaces.map((space) => (
                <button
                  key={space.id}
                  onClick={() => handleSpaceClick(space.id)}
                  onContextMenu={(e) => handleContextMenu(e, space)}
                  className={`
                    w-8 h-8 rounded-md flex items-center justify-center text-sm
                    transition-all
                    ${space.id === activeSpaceId 
                      ? 'ring-2 ring-offset-1 ring-offset-neutral-900' 
                      : 'hover:scale-105'
                    }
                  `}
                  style={{ 
                    backgroundColor: space.color + '25',
                    borderColor: space.color,
                    ...(space.id === activeSpaceId && { ringColor: space.color })
                  }}
                  title={space.name}
                >
                  {space.icon}
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* Footer - Space count */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-neutral-700 text-xs text-neutral-500">
            {spaces.length} {spaces.length === 1 ? 'space' : 'spaces'}
          </div>
        )}
      </aside>

      {/* Context Menu */}
      {contextMenu && (
        <SpaceContextMenu
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onDelete={() => {
            setDeleteDialogSpace(contextMenu.space)
            setContextMenu(null)
          }}
          onExport={() => handleExport(contextMenu.space)}
        />
      )}

      {/* Dialogs */}
      <CreateSpaceDialog 
        isOpen={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)} 
      />
      <DeleteSpaceDialog
        space={deleteDialogSpace}
        isOpen={deleteDialogSpace !== null}
        onClose={() => setDeleteDialogSpace(null)}
      />
    </>
  )
}
