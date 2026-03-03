/**
 * Custom Zustand storage adapter that uses Tauri file system
 * with debounced auto-save and fallback to localStorage
 * 
 * This implementation uses localStorage as the primary storage for Zustand
 * but also syncs to Tauri file system for data persistence.
 */

import { readData, writeData, isTauri, type PersistedData } from './persistence'

// Debounce timer
let saveTimeout: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 800

// Track if we've loaded from file already
let initialLoadDone = false

/**
 * Initialize storage - attempts to load from Tauri file first
 * Returns the initial state from file or null if using defaults
 */
export const initializeStorage = async (): Promise<{
  spaces: unknown[]
  activeSpaceId: string | null
} | null> => {
  if (!isTauri() || initialLoadDone) {
    return null
  }
  
  try {
    const data = await readData()
    if (data && data.spaces && data.spaces.length > 0) {
      initialLoadDone = true
      // Write back to localStorage so Zustand can use it
      const zustandFormat = {
        version: data.version,
        state: {
          spaces: data.spaces,
          activeSpaceId: data.activeSpaceId,
        },
      }
      localStorage.setItem('mindjot-spaces', JSON.stringify(zustandFormat))
      console.log('[Persistence] Loaded from file, synced to localStorage')
      return {
        spaces: data.spaces,
        activeSpaceId: data.activeSpaceId,
      }
    }
  } catch (error) {
    console.warn('[Persistence] Failed to load from file:', error)
  }
  
  return null
}

/**
 * Sync state to file system (called when state changes)
 */
export const syncToFile = (state: { spaces: unknown[]; activeSpaceId: string | null }): void => {
  if (!isTauri()) return
  
  // Clear any pending save
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  
  // Debounce the save
  saveTimeout = setTimeout(async () => {
    try {
      const data: PersistedData = {
        version: 1,
        spaces: state.spaces as any[],
        activeSpaceId: state.activeSpaceId,
      }
      await writeData(data)
      console.log('[Persistence] Synced to file')
    } catch (error) {
      console.error('[Persistence] Failed to sync to file:', error)
    }
  }, DEBOUNCE_MS)
}

/**
 * Force an immediate sync to file
 */
export const flushSync = async (): Promise<void> => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  // Trigger a final sync by reading current localStorage and writing to file
  if (isTauri()) {
    try {
      const stored = localStorage.getItem('mindjot-spaces')
      if (stored) {
        const parsed = JSON.parse(stored)
        const data: PersistedData = {
          version: parsed.version || 1,
          spaces: parsed.state?.spaces || [],
          activeSpaceId: parsed.state?.activeSpaceId || null,
        }
        await writeData(data)
      }
    } catch (error) {
      console.error('[Persistence] Final sync failed:', error)
    }
  }
}
