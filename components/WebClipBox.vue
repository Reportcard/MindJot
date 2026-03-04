<template>
  <div 
    class="web-clip-box bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
    @click="openLink"
  >
    <!-- Thumbnail -->
    <div v-if="clip.image" class="clip-thumbnail relative h-32 bg-gray-100">
      <img 
        :src="clip.image" 
        :alt="clip.title"
        class="w-full h-full object-cover"
        @error="handleImageError"
      />
    </div>
    <div v-else class="clip-thumbnail h-32 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <svg class="w-12 h-12 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    </div>
    
    <!-- Content -->
    <div class="clip-content p-4">
      <div class="flex items-start gap-2">
        <!-- Favicon -->
        <img 
          v-if="clip.favicon" 
          :src="clip.favicon" 
          class="w-4 h-4 mt-1 flex-shrink-0"
          @error="handleFaviconError"
        />
        <div class="flex-1 min-w-0">
          <h3 class="clip-title font-semibold text-gray-900 truncate text-sm">
            {{ clip.title }}
          </h3>
          <p class="clip-description text-xs text-gray-500 mt-1 line-clamp-2">
            {{ clip.description || 'No description available' }}
          </p>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="clip-actions flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <button 
          @click.stop="refreshMetadata"
          class="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition-colors"
          title="Refresh metadata"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': isRefreshing }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button 
          @click.stop="deleteClip"
          class="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
          title="Delete clip"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <span class="ml-auto text-xs text-gray-400">
          {{ formatDate(clip.createdAt) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WebClipBox',
  props: {
    clip: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      isRefreshing: false
    }
  },
  methods: {
    openLink() {
      window.open(this.clip.url, '_blank')
    },
    async refreshMetadata() {
      this.isRefreshing = true
      try {
        await this.$store.dispatch('clips/refreshMetadata', this.clip.id)
      } finally {
        this.isRefreshing = false
      }
    },
    deleteClip() {
      this.$store.dispatch('clips/deleteClip', this.clip.id)
    },
    handleImageError(e) {
      e.target.style.display = 'none'
    },
    handleFaviconError(e) {
      e.target.style.display = 'none'
    },
    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }
}
</script>
