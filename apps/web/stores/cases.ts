import { defineStore } from 'pinia'
import { apiFetch } from '~/composables/useApi'

export interface CaseStep {
  content: string
  expected: string
}

export interface ProjectModule {
  id: string
  projectId: string
  name: string
  code: string
  description?: string | null
  caseCount: number
  createdAt: string
  updatedAt: string
}

export interface TestCase {
  id: string
  code: string
  sectionId: string
  sectionName?: string
  moduleId?: string | null
  moduleName?: string | null
  moduleCode?: string | null
  actor?: string | null
  condition?: string | null
  title: string
  description?: string | null
  type: string
  priority: string
  template: string
  preconditions?: string | null
  steps?: CaseStep[] | null
  expectedResult?: string | null
  testData?: string | null
  statusData?: string | null
  actualResult?: string | null
  notes?: string | null
  estimate?: number | null
  refs?: string | null
  automationStatus: string
  automationKey?: string | null
  labels?: string[] | null
  createdByName?: string
  isLocked?: boolean
  runCount?: number
  createdAt: string
  updatedAt: string
  versions?: Array<{
    id: string
    snapshot: any
    createdAt: string
    changedByName: string
  }>
}

export interface SectionNode {
  id: string
  suiteId: string
  parentId: string | null
  name: string
  description: string | null
  sortOrder: number
  depth: number
  caseCount: number
  children: SectionNode[]
}

export const useCaseStore = defineStore('cases', {
  state: () => ({
    modules: [] as ProjectModule[],
    sections: [] as SectionNode[],
    cases: [] as TestCase[],
    totalCases: 0,
    selectedSectionId: null as string | null,
    selectedModuleId: null as string | null,
    selectedCase: null as TestCase | null,
    isLoading: false,
    filters: {
      priority: '',
      type: '',
      condition: '',
      automationStatus: '',
      search: '',
      page: 1,
      limit: 100,
    },
  }),

  getters: {
    totalProjectCases: (state) => {
      return state.cases.length
    },
  },

  actions: {
    async fetchModules(projectId: string) {
      const res = await apiFetch<ProjectModule[]>(`/api/v1/projects/${projectId}/modules`)
      if (res.data) {
        this.modules = res.data
      }
      return res
    },

    async createModule(projectId: string, payload: { name: string; code?: string; description?: string }) {
      const res = await apiFetch<ProjectModule>(`/api/v1/projects/${projectId}/modules`, {
        method: 'POST',
        body: payload,
      })
      if (res.data) {
        await this.fetchModules(projectId)
      }
      return res
    },

    async getNextCaseId(projectId: string, moduleId: string): Promise<string> {
      const res = await apiFetch<{ nextId: string }>(`/api/v1/projects/${projectId}/modules/${moduleId}/next-case-id`)
      return res.data?.nextId ?? ''
    },

    async fetchSections(projectId: string) {
      const result = await apiFetch<SectionNode[]>(`/api/v1/projects/${projectId}/sections`)
      if (result.data) {
        this.sections = result.data
      }
    },

    async fetchCases(projectId: string) {
      this.isLoading = true
      const query = new URLSearchParams()
      if (this.selectedModuleId) query.set('moduleId', this.selectedModuleId)
      if (this.selectedSectionId) query.set('sectionId', this.selectedSectionId)
      if (this.filters.priority) query.set('priority', this.filters.priority)
      if (this.filters.type) query.set('type', this.filters.type)
      if (this.filters.condition) query.set('condition', this.filters.condition)
      if (this.filters.automationStatus) query.set('automationStatus', this.filters.automationStatus)
      if (this.filters.search) query.set('search', this.filters.search)
      query.set('page', String(this.filters.page))
      query.set('limit', String(this.filters.limit))

      const url = `/api/v1/projects/${projectId}/cases?${query.toString()}`
      const result = await apiFetch<TestCase[]>(url)

      if (result.data) {
        this.cases = result.data
        const raw = result as any
        this.totalCases = raw.data?.length ?? 0
      }
      this.isLoading = false
    },

    async fetchCaseDetail(caseId: string) {
      const result = await apiFetch<TestCase>(`/api/v1/cases/${caseId}`)
      if (result.data) {
        this.selectedCase = result.data
      }
      return result
    },

    async createCase(projectId: string, payload: any) {
      const result = await apiFetch<TestCase>(`/api/v1/projects/${projectId}/cases`, {
        method: 'POST',
        body: payload,
      })
      if (result.data) {
        await this.fetchCases(projectId)
        await this.fetchModules(projectId)
        await this.fetchSections(projectId)
      }
      return result
    },

    async updateCase(caseId: string, projectId: string, payload: any) {
      const result = await apiFetch<TestCase>(`/api/v1/cases/${caseId}`, {
        method: 'PATCH',
        body: payload,
      })
      if (result.data) {
        await this.fetchCases(projectId)
        await this.fetchModules(projectId)
        if (this.selectedCase?.id === caseId) {
          await this.fetchCaseDetail(caseId)
        }
      }
      return result
    },

    async deleteCase(caseId: string, projectId: string) {
      const result = await apiFetch(`/api/v1/cases/${caseId}`, { method: 'DELETE' })
      if (!result.error) {
        await this.fetchCases(projectId)
        await this.fetchModules(projectId)
        await this.fetchSections(projectId)
        if (this.selectedCase?.id === caseId) {
          this.selectedCase = null
        }
      }
      return result
    },

    async createSection(projectId: string, payload: { name: string; description?: string; parentId?: string | null }) {
      const result = await apiFetch<SectionNode>(`/api/v1/projects/${projectId}/sections`, {
        method: 'POST',
        body: payload,
      })
      if (result.data) {
        await this.fetchSections(projectId)
      }
      return result
    },

    async deleteSection(sectionId: string, projectId: string) {
      const result = await apiFetch(`/api/v1/sections/${sectionId}`, { method: 'DELETE' })
      if (!result.error) {
        if (this.selectedSectionId === sectionId) {
          this.selectedSectionId = null
        }
        await this.fetchSections(projectId)
        await this.fetchCases(projectId)
      }
      return result
    },
  },
})
