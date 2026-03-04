export default function ({ store }) {
  if (process.client) {
    document.addEventListener('keydown', (e) => {
      // W key to create new web clip
      if (e.key === 'w' || e.key === 'W') {
        // Don't trigger if typing in an input
        if (document.activeElement?.tagName === 'INPUT' || 
            document.activeElement?.tagName === 'TEXTAREA' ||
            document.activeElement?.contentEditable === 'true') {
          return
        }
        store.commit('clips/SET_SHOW_MODAL', true)
      }
      
      // Escape to close modal
      if (e.key === 'Escape') {
        store.commit('clips/SET_SHOW_MODAL', false)
      }
    })
  }
}
