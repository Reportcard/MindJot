/**
 * Library exports for MindJot persistence layer
 */

export {
  isTauri,
  getDataDir,
  ensureDataDir,
  readData,
  writeData,
  readConfig,
  writeConfig,
  exportData,
  importData,
  getStorageInfo,
  type PersistedData,
  type UserConfig,
} from './persistence'

export {
  syncToFile,
  initializeStorage,
  flushSync,
} from './tauriStorage'
