export const state = () => ({
  clips: [],
  isLoading: false,
  showCreateModal: false
})

export const mutations = {
  ADD_CLIP(state, clip) {
    state.clips.unshift(clip)
  },
  UPDATE_CLIP(state, { id, updates }) {
    const index = state.clips.findIndex(c => c.id === id)
    if (index !== -1) {
      state.clips[index] = { ...state.clips[index], ...updates }
    }
  },
  REMOVE_CLIP(state, id) {
    state.clips = state.clips.filter(c => c.id !== id)
  },
  SET_LOADING(state, isLoading) {
    state.isLoading = isLoading
  },
  SET_SHOW_MODAL(state, show) {
    state.showCreateModal = show
  },
  SET_CLIPS(state, clips) {
    state.clips = clips
  }
}

export const actions = {
  async fetchMetadata({ commit }, url) {
    commit('SET_LOADING', true)
    try {
      // Use a CORS proxy for metadata fetching
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
      const response = await fetch(proxyUrl)
      const html = await response.text()
      
      // Parse metadata from HTML
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      
      const title = doc.querySelector('meta[property="og:title"]')?.content 
        || doc.querySelector('title')?.textContent 
        || url
      
      const description = doc.querySelector('meta[property="og:description"]')?.content
        || doc.querySelector('meta[name="description"]')?.content
        || ''
      
      const image = doc.querySelector('meta[property="og:image"]')?.content
        || doc.querySelector('meta[name="twitter:image"]')?.content
        || ''
      
      // Try to get favicon
      const favicon = doc.querySelector('link[rel="icon"]')?.href
        || doc.querySelector('link[rel="shortcut icon"]')?.href
        || new URL(url).origin + '/favicon.ico'
      
      return { title, description, image, favicon, url }
    } catch (error) {
      console.error('Failed to fetch metadata:', error)
      return {
        title: url,
        description: '',
        image: '',
        favicon: '',
        url
      }
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  async createClip({ commit, dispatch }, url) {
    const metadata = await dispatch('fetchMetadata', url)
    const clip = {
      id: Date.now().toString(),
      ...metadata,
      createdAt: new Date().toISOString()
    }
    commit('ADD_CLIP', clip)
    return clip
  },
  
  async refreshMetadata({ commit, dispatch, state }, id) {
    const clip = state.clips.find(c => c.id === id)
    if (!clip) return
    
    commit('SET_LOADING', true)
    try {
      const metadata = await dispatch('fetchMetadata', clip.url)
      commit('UPDATE_CLIP', { id, updates: metadata })
    } finally {
      commit('SET_LOADING', false)
    }
  },
  
  deleteClip({ commit }, id) {
    commit('REMOVE_CLIP', id)
  }
}

export const getters = {
  clips: state => state.clips,
  isLoading: state => state.isLoading,
  showCreateModal: state => state.showCreateModal
}
