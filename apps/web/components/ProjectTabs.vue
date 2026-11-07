<script setup lang="ts">
import { useProjectStore } from '~/stores/projects'

interface Props {
  projectId: string
  activeTab: 'overview' | 'cases' | 'runs' | 'milestones' | 'reports'
}

const props = defineProps<Props>()
const projectStore = useProjectStore()

onMounted(async () => {
  if (!projectStore.currentProject || projectStore.currentProject.id !== props.projectId) {
    await projectStore.fetchProject(props.projectId)
  }
})

const tabs = computed(() => [
  { label: 'Ringkasan', id: 'overview', icon: 'i-lucide-layout-dashboard', to: `/projects/${props.projectId}` },
  { label: 'Test Cases', id: 'cases', icon: 'i-lucide-file-check-2', to: `/projects/${props.projectId}/cases` },
  { label: 'Test Runs', id: 'runs', icon: 'i-lucide-play-circle', to: `/projects/${props.projectId}/runs` },
  { label: 'Milestones', id: 'milestones', icon: 'i-lucide-flag', to: `/projects/${props.projectId}/milestones` },
  { label: 'Laporan', id: 'reports', icon: 'i-lucide-bar-chart-2', to: `/projects/${props.projectId}/reports` },
])
</script>

<template>
  <div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 pt-4 shrink-0">
    <div class="max-w-7xl mx-auto">
      <div class="flex items-center justify-between gap-4 mb-2">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-folder-open" class="text-primary-600 text-lg shrink-0" />
          <nav class="text-sm text-gray-500 dark:text-gray-400 flex items-center">
            <NuxtLink to="/projects" class="hover:text-primary-600 dark:hover:text-primary-400">Proyek</NuxtLink>
            <span class="mx-2">/</span>
            <span class="text-gray-900 dark:text-white font-semibold truncate max-w-xs md:max-w-md">
              {{ projectStore.currentProject?.name ?? 'Memuat proyek...' }}
            </span>
          </nav>
        </div>
        <div class="flex items-center gap-2">
          <slot name="actions" />
        </div>
      </div>

      <!-- Project Tab Bar -->
      <div class="flex items-center gap-1 overflow-x-auto border-t border-gray-100 dark:border-gray-800 pt-1">
        <NuxtLink
          v-for="t in tabs"
          :key="t.id"
          :to="t.to"
          class="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
          :class="t.id === activeTab
            ? 'border-primary-600 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'"
        >
          <UIcon :name="t.icon" class="text-base" />
          <span>{{ t.label }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
