# MindJot

Your intelligent note-taking companion - a desktop application built with Tauri.

## Tech Stack

- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Desktop Framework**: Tauri 2.x (Rust)
- **State Management**: Zustand (coming soon)

## Development

### Prerequisites

- Node.js 18+
- Rust (latest stable)
- Platform-specific dependencies for Tauri:
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft Visual Studio C++ Build Tools, WebView2
  - **Linux**: `webkit2gtk-4.1`, `libayatana-appindicator3-dev`, etc.

See [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/) for details.

### Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Available Scripts

- `npm run dev` - Start Vite dev server (frontend only)
- `npm run build` - Build frontend for production
- `npm run tauri dev` - Run Tauri in development mode
- `npm run tauri build` - Build Tauri application

## Project Structure

```
mindjot/
├── src/              # React frontend source
├── src-tauri/        # Tauri/Rust backend
│   ├── src/          # Rust source code
│   ├── icons/        # App icons
│   └── tauri.conf.json
├── public/           # Static assets
└── dist/             # Built frontend (generated)
```

## License

MIT
