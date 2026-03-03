/**
 * File-based persistence layer for MindJot using Tauri fs APIs
 * Falls back to localStorage when running in browser or if file operations fail
 */

import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
} from '@tauri-apps/plugin-fs'
import { appDataDir } from '@tauri-apps/api/path'
import { save, open } from '@tauri-apps/plugin-dialog'

// Data directory structure
const DATA_FILE = 'data.json'
const CONFIG_FILE = 'config.json'
const CACHE_DIR = 'cache'

// Check if running in Tauri environment
export const isTauri = (): boolean => {
  return '__TAURI_INTERNALS__' in window
}

// Get the app data directory path
let cachedDataDir: string | null = null
export const getDataDir = async (): Promise<string> => {
  if (cachedDataDir) return cachedDataDir
  
  if (!isTauri()) {
    throw new Error('Not running in Tauri environment')
  }
  
  const dir = await appDataDir()
  cachedDataDir = dir
  return dir
}

// Ensure the data directory structure exists
export const ensureDataDir = async (): Promise<void> => {
  if (!isTauri()) return
  
  const dataDir = await getDataDir()
  
  // Create main data directory if it doesn't exist
  if (!(await exists(dataDir))) {
    await mkdir(dataDir, { recursive: true })
  }
  
  // Create cache subdirectory
  const cacheDir = `${dataDir}${CACHE_DIR}`
  if (!(await exists(cacheDir))) {
    await mkdir(cacheDir, { recursive: true })
  }
}

// Data types
export interface PersistedData {
  version: number
  spaces: unknown[]
  activeSpaceId: string | null
  config?: UserConfig
}

export interface UserConfig {
  theme?: 'light' | 'dark' | 'system'
  defaultGridSize?: number
  snapToGrid?: boolean
  autoSave?: boolean
}

// Default data structure
const getDefaultData = (): PersistedData => ({
  version: 1,
  spaces: [],
  activeSpaceId: null,
  config: {
    theme: 'system',
    defaultGridSize: 20,
    snapToGrid: true,
    autoSave: true,
  },
})

/**
 * Read data from file system
 * Falls back to localStorage if file operations fail
 */
export const readData = async (): Promise<PersistedData | null> => {
  // Try Tauri fs first
  if (isTauri()) {
    try {
      await ensureDataDir()
      const dataDir = await getDataDir()
      const filePath = `${dataDir}${DATA_FILE}`
      
      if (await exists(filePath)) {
        const content = await readTextFile(filePath)
        const data = JSON.parse(content) as PersistedData
        console.log('[Persistence] Loaded data from file:', filePath)
        return data
      }
    } catch (error) {
      console.warn('[Persistence] Failed to read from file, trying localStorage:', error)
    }
  }
  
  // Fallback to localStorage
  try {
    const stored = localStorage.getItem('mindjot-spaces')
    if (stored) {
      const parsed = JSON.parse(stored)
      console.log('[Persistence] Loaded data from localStorage')
      // Transform localStorage format to our format
      return {
        version: parsed.version || 1,
        spaces: parsed.state?.spaces || [],
        activeSpaceId: parsed.state?.activeSpaceId || null,
        config: getDefaultData().config,
      }
    }
  } catch (error) {
    console.warn('[Persistence] Failed to read from localStorage:', error)
  }
  
  return null
}

/**
 * Write data to file system
 * Falls back to localStorage if file operations fail
 */
export const writeData = async (data: PersistedData): Promise<boolean> => {
  // Try Tauri fs first
  if (isTauri()) {
    try {
      await ensureDataDir()
      const dataDir = await getDataDir()
      const filePath = `${dataDir}${DATA_FILE}`
      
      const content = JSON.stringify(data, null, 2)
      await writeTextFile(filePath, content)
      console.log('[Persistence] Saved data to file:', filePath)
      return true
    } catch (error) {
      console.warn('[Persistence] Failed to write to file, trying localStorage:', error)
    }
  }
  
  // Fallback to localStorage
  try {
    // Transform to Zustand persist format for compatibility
    const zustandFormat = {
      version: data.version,
      state: {
        spaces: data.spaces,
        activeSpaceId: data.activeSpaceId,
      },
    }
    localStorage.setItem('mindjot-spaces', JSON.stringify(zustandFormat))
    console.log('[Persistence] Saved data to localStorage')
    return true
  } catch (error) {
    console.error('[Persistence] Failed to save data:', error)
    return false
  }
}

/**
 * Read user configuration
 */
export const readConfig = async (): Promise<UserConfig> => {
  if (isTauri()) {
    try {
      await ensureDataDir()
      const dataDir = await getDataDir()
      const filePath = `${dataDir}${CONFIG_FILE}`
      
      if (await exists(filePath)) {
        const content = await readTextFile(filePath)
        return JSON.parse(content) as UserConfig
      }
    } catch (error) {
      console.warn('[Persistence] Failed to read config:', error)
    }
  }
  
  // Return defaults
  return getDefaultData().config!
}

/**
 * Write user configuration
 */
export const writeConfig = async (config: UserConfig): Promise<boolean> => {
  if (isTauri()) {
    try {
      await ensureDataDir()
      const dataDir = await getDataDir()
      const filePath = `${dataDir}${CONFIG_FILE}`
      
      await writeTextFile(filePath, JSON.stringify(config, null, 2))
      return true
    } catch (error) {
      console.warn('[Persistence] Failed to write config:', error)
    }
  }
  return false
}

/**
 * Export all data to a user-selected file
 */
export const exportData = async (data: PersistedData): Promise<boolean> => {
  const exportPayload = {
    ...data,
    exportedAt: new Date().toISOString(),
    app: 'MindJot',
    appVersion: '0.1.0',
  }
  
  const content = JSON.stringify(exportPayload, null, 2)
  
  if (isTauri()) {
    try {
      const filePath = await save({
        title: 'Export MindJot Data',
        defaultPath: `mindjot-backup-${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      
      if (filePath) {
        await writeTextFile(filePath, content)
        console.log('[Persistence] Exported data to:', filePath)
        return true
      }
    } catch (error) {
      console.error('[Persistence] Export failed:', error)
    }
  } else {
    // Browser fallback: trigger download
    try {
      const blob = new Blob([content], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mindjot-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      return true
    } catch (error) {
      console.error('[Persistence] Browser export failed:', error)
    }
  }
  
  return false
}

/**
 * Import data from a user-selected file
 */
export const importData = async (): Promise<PersistedData | null> => {
  if (isTauri()) {
    try {
      const filePath = await open({
        title: 'Import MindJot Data',
        multiple: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      
      if (filePath && typeof filePath === 'string') {
        const content = await readTextFile(filePath)
        const data = JSON.parse(content) as PersistedData & { app?: string }
        
        // Validate it's MindJot data
        if (data.version && Array.isArray(data.spaces)) {
          console.log('[Persistence] Imported data from:', filePath)
          return {
            version: data.version,
            spaces: data.spaces,
            activeSpaceId: data.activeSpaceId,
            config: data.config,
          }
        } else {
          throw new Error('Invalid MindJot data format')
        }
      }
    } catch (error) {
      console.error('[Persistence] Import failed:', error)
      throw error
    }
  } else {
    // Browser fallback: file input
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) {
          resolve(null)
          return
        }
        
        try {
          const content = await file.text()
          const data = JSON.parse(content) as PersistedData
          
          if (data.version && Array.isArray(data.spaces)) {
            resolve({
              version: data.version,
              spaces: data.spaces,
              activeSpaceId: data.activeSpaceId,
              config: data.config,
            })
          } else {
            reject(new Error('Invalid MindJot data format'))
          }
        } catch (error) {
          reject(error)
        }
      }
      
      input.click()
    })
  }
  
  return null
}

/**
 * Get storage info for debugging
 */
export const getStorageInfo = async (): Promise<{
  type: 'file' | 'localStorage'
  path?: string
}> => {
  if (isTauri()) {
    try {
      const dataDir = await getDataDir()
      return { type: 'file', path: dataDir }
    } catch {
      // Fall through to localStorage
    }
  }
  return { type: 'localStorage' }
}
