import { defineStore } from 'pinia'
import { apiFetch } from '~/composables/useApi'

export interface Project {
  id: string
  name: string
  description: string | null
  announcement: string | null
  isCompleted: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const useProjectStore = defineStore('projects', {
  state: () => ({
    projects: [] as Project[],
    currentProject: null as (Project & { members?: unknown[] }) | null,
    isLoading: false,
  }),

  actions: {
    async fetchProjects() {
      this.isLoading = true
      const result = await apiFetch<Project[]>('/api/v1/projects')
      if (result.data) {
        this.projects = result.data
      }
      this.isLoading = false
    },

    async fetchProject(id: string) {
      this.isLoading = true
      const result = await apiFetch<Project & { members?: unknown[] }>(`/api/v1/projects/${id}`)
      if (result.data) {
        this.currentProject = result.data
      }
      this.isLoading = false
      return result
    },

    async createProject(body: { name: string; description?: string; announcement?: string }) {
      const result = await apiFetch<Project>('/api/v1/projects', { method: 'POST', body })
      if (result.data) {
        this.projects.push(result.data)
      }
      return result
    },
  },
})
