import { defineStore } from 'pinia'
import { apiFetch } from '~/composables/useApi'

export interface Status {
  id: number
  name: string
  label: string
  color: string
  isFinal: boolean
  isDefault: boolean
  isSystem: boolean
  sortOrder: number
}

export const useStatusStore = defineStore('statuses', {
  state: () => ({
    statuses: [] as Status[],
    loaded: false,
  }),

  getters: {
    byId: (state) => (id: number) => state.statuses.find((s) => s.id === id),
    defaultStatus: (state) => state.statuses.find((s) => s.isDefault),
  },

  actions: {
    async fetchStatuses() {
      if (this.loaded) return
      const result = await apiFetch<Status[]>('/api/v1/statuses')
      if (result.data) {
        this.statuses = result.data
        this.loaded = true
      }
    },
  },
})
