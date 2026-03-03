import { Sidebar, Toolbar, Canvas, StatusBar } from './components'
import './App.css'

function App() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-neutral-950">
      {/* Top Toolbar */}
      <Toolbar />
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />
        
        {/* Center Canvas */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <Canvas />
        </main>
      </div>
      
      {/* Bottom Status Bar */}
      <StatusBar />
    </div>
  )
}

export default App
