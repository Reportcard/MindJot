<template>
  <div class="toolbar flex items-center justify-between p-4 bg-white border-b border-gray-200">
    <div class="flex items-center gap-4">
      <h1 class="text-xl font-bold text-indigo-600">MindJot</h1>
      <span class="text-xs text-gray-400">Press <kbd class="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">W</kbd> to add clip</span>
    </div>
    <button 
      @click="showCreateModal = true"
      class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      <span>Add Web Clip</span>
    </button>
  </div>
</template>

<script>
export default {
  name: 'Toolbar',
  computed: {
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
