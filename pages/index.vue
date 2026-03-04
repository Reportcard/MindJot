<template>
  <div class="min-h-screen bg-gray-50">
    <Toolbar />
    
    <main class="container mx-auto px-4 py-8">
      <!-- Empty state -->
      <div v-if="clips.length === 0" class="flex flex-col items-center justify-center py-20">
        <svg class="w-24 h-24 text-gray-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <h2 class="text-2xl font-semibold text-gray-700 mb-2">No web clips yet</h2>
        <p class="text-gray-500 mb-6">Press <kbd class="px-2 py-1 bg-gray-200 rounded text-gray-700 font-mono">W</kbd> or click the button to add your first clip</p>
        <button 
          @click="showCreateModal = true"
          class="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Web Clip</span>
        </button>
      </div>
      
      <!-- Clips grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <WebClipBox 
          v-for="clip in clips" 
          :key="clip.id" 
          :clip="clip"
        />
      </div>
    </main>
    
    <CreateClipModal />
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'IndexPage',
  computed: {
    ...mapState('clips', ['clips']),
    showCreateModal: {
      get() {
        return this.$store.state.clips.showCreateModal
      },
      set(value) {
        this.$store.commit('clips/SET_SHOW_MODAL', value)
      }
    }
  }
}
</script>
