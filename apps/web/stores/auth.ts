import { defineStore } from 'pinia'
import { apiFetch } from '~/composables/useApi'

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'lead' | 'tester' | 'viewer'
  isActive: boolean
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    isLoading: false,
    initialized: false,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
    isLead: (state) => state.user?.role === 'admin' || state.user?.role === 'lead',
    canEdit: (state) =>
      state.user?.role === 'admin' ||
      state.user?.role === 'lead' ||
      state.user?.role === 'tester',
  },

  actions: {
    async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
      this.isLoading = true
      try {
        const result = await apiFetch<User>('/auth/login', {
          method: 'POST',
          body: { email, password },
        })

        if (result.error) {
          return { success: false, error: result.error }
        }

        this.user = result.data
        return { success: true }
      } finally {
        this.isLoading = false
      }
    },

    async logout() {
      await apiFetch('/auth/logout', { method: 'POST' })
      this.user = null
      await navigateTo('/login')
    },

    async fetchMe(): Promise<boolean> {
      const result = await apiFetch<User>('/auth/me')
      if (result.error || !result.data) {
        this.user = null
        this.initialized = true
        return false
      }
      this.user = result.data
      this.initialized = true
      return true
    },
  },
})
