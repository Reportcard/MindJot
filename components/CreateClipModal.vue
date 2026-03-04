<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/50" @click="close"></div>
    
    <!-- Modal -->
    <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Add Web Clip</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">URL</label>
          <input 
            v-model="url"
            type="url"
            placeholder="https://example.com"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            @keyup.enter="addClip"
          />
        </div>
        
        <!-- Preview -->
        <div v-if="preview" class="p-3 bg-gray-50 rounded-lg">
          <div class="flex items-center gap-3">
            <img v-if="preview.favicon" :src="preview.favicon" class="w-6 h-6" />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 truncate">{{ preview.title }}</p>
              <p class="text-xs text-gray-500 truncate">{{ preview.url }}</p>
            </div>
          </div>
        </div>
        
        <!-- Loading -->
        <div v-if="isLoading" class="flex items-center justify-center py-4">
          <svg class="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="ml-2 text-gray-600">Fetching metadata...</span>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex justify-end gap-3 mt-6">
        <button 
          @click="close"
          class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button 
          @click="addClip"
          :disabled="!isValidUrl || isLoading"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add Clip
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CreateClipModal',
  data() {
    return {
      url: '',
      preview: null
    }
  },
  computed: {
    show() {
      return this.$store.state.clips.showCreateModal
    },
    isLoading() {
      return this.$store.state.clips.isLoading
    },
    isValidUrl() {
      try {
        new URL(this.url)
        return true
      } catch {
        return false
      }
    }
  },
  watch: {
    async url(newUrl) {
      if (this.isValidUrl) {
        // Debounce - fetch preview
        clearTimeout(this.debounceTimer)
        this.debounceTimer = setTimeout(async () => {
          this.preview = await this.$store.dispatch('clips/fetchMetadata', newUrl)
        }, 500)
      } else {
        this.preview = null
      }
    },
    show(val) {
      if (!val) {
        this.url = ''
        this.preview = null
      }
    }
  },
  methods: {
    async addClip() {
      if (!this.isValidUrl || this.isLoading) return
      
      await this.$store.dispatch('clips/createClip', this.url)
      this.close()
    },
    close() {
      this.$store.commit('clips/SET_SHOW_MODAL', false)
    }
  },
  beforeDestroy() {
    clearTimeout(this.debounceTimer)
  }
}
</script>
