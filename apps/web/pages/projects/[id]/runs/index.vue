<script setup lang="ts">
import { apiFetch } from '~/composables/useApi'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const projectId = computed(() => route.params.id as string)

interface RunStats {
  total: number
  passed: number
  failed: number
  blocked: number
  retest: number
  untested: number
  percent: number
}

interface TestRunItem {
  id: string
  projectId: string
  milestoneId: string | null
  milestoneName: string | null
  name: string
  description: string | null
  assignedTo: string | null
  assignedToName: string | null
  includeAll: boolean
  isCompleted: boolean
  completedAt: string | null
  source: 'manual' | 'automation'
  ciInfo: any
  createdAt: string
  stats: RunStats
}

const runs = ref<TestRunItem[]>([])
const loading = ref(true)
const filterTab = ref<'all' | 'active' | 'completed'>('all')
const searchQuery = ref('')

async function fetchRuns() {
  loading.value = true
  const res = await apiFetch<TestRunItem[]>(`/api/v1/projects/${projectId.value}/runs`)
  if (res.data) {
    runs.value = res.data
  }
  loading.value = false
}

onMounted(() => {
  fetchRuns()
})

const filteredRuns = computed(() => {
  return runs.value.filter((r) => {
    if (filterTab.value === 'active' && r.isCompleted) return false
    if (filterTab.value === 'completed' && !r.isCompleted) return false
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      return r.name.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q))
    }
    return true
  })
})

const activeCount = computed(() => runs.value.filter((r) => !r.isCompleted).length)
const completedCount = computed(() => runs.value.filter((r) => r.isCompleted).length)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
    <!-- Project Tabs Header -->
    <ProjectTabs :project-id="projectId" active-tab="runs">
      <template #actions>
        <UButton
          :to="`/projects/${projectId}/runs/new`"
          icon="i-lucide-plus"
          label="Buat Test Run"
          color="primary"
          size="sm"
        />
      </template>
    </ProjectTabs>

    <!-- Content -->
    <div class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
      <!-- Top Filters & Search -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <!-- Tabs Active vs Completed -->
        <div class="flex items-center gap-2">
          <UButton
            :variant="filterTab === 'all' ? 'solid' : 'ghost'"
            color="gray"
            size="sm"
            @click="filterTab = 'all'"
          >
            Semua ({{ runs.length }})
          </UButton>
          <UButton
            :variant="filterTab === 'active' ? 'solid' : 'ghost'"
            color="gray"
            size="sm"
            @click="filterTab = 'active'"
          >
            Aktif ({{ activeCount }})
          </UButton>
          <UButton
            :variant="filterTab === 'completed' ? 'solid' : 'ghost'"
            color="gray"
            size="sm"
            @click="filterTab = 'completed'"
          >
            Selesai ({{ completedCount }})
          </UButton>
        </div>

        <div class="w-full sm:w-72">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Cari test run..."
            size="sm"
          />
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-4">
        <USkeleton class="h-28 rounded-xl" />
        <USkeleton class="h-28 rounded-xl" />
        <USkeleton class="h-28 rounded-xl" />
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredRuns.length === 0"
        class="text-center py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl"
      >
        <UIcon name="i-lucide-play-circle" class="text-5xl text-gray-400 mb-3" />
        <h3 class="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-1">
          Tidak ada Test Run
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
          Mulai eksekusi pengujian dengan membuat Test Run baru untuk kasus uji manual atau automation.
        </p>
        <UButton
          :to="`/projects/${projectId}/runs/new`"
          icon="i-lucide-plus"
          label="Buat Test Run Baru"
          color="primary"
        />
      </div>

      <!-- Run Cards / Table -->
      <div v-else class="space-y-4">
        <div
          v-for="run in filteredRuns"
          :key="run.id"
          class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-primary-500/50 dark:hover:border-primary-500/50 rounded-xl p-5 shadow-xs transition-all cursor-pointer group"
          @click="navigateTo(`/projects/${projectId}/runs/${run.id}`)"
        >
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <!-- Left Info -->
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-1.5">
                <UBadge
                  :label="run.isCompleted ? 'Selesai' : 'Aktif'"
                  :color="run.isCompleted ? 'gray' : 'green'"
                  variant="subtle"
                  size="xs"
                />
                <UBadge
                  v-if="run.source === 'automation'"
                  label="Playwright CI"
                  color="purple"
                  variant="subtle"
                  size="xs"
                  icon="i-lucide-cpu"
                />
                <UBadge
                  v-else
                  label="Manual"
                  color="blue"
                  variant="subtle"
                  size="xs"
                  icon="i-lucide-user"
                />
                <span v-if="run.milestoneName" class="text-xs text-gray-500 flex items-center gap-1">
                  <UIcon name="i-lucide-flag" class="text-xs" />
                  {{ run.milestoneName }}
                </span>
              </div>

              <h3 class="font-semibold text-gray-900 dark:text-white text-base group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {{ run.name }}
              </h3>

              <p v-if="run.description" class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                {{ run.description }}
              </p>

              <div class="flex items-center gap-4 mt-2 text-xs text-gray-400">
                <span v-if="run.assignedToName" class="flex items-center gap-1">
                  <UIcon name="i-lucide-user" class="text-xs" />
                  {{ run.assignedToName }}
                </span>
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-calendar" class="text-xs" />
                  Dibuat {{ formatDate(run.createdAt) }}
                </span>
              </div>
            </div>

            <!-- Right Progress Bar & Stats -->
            <div class="w-full md:w-80 shrink-0 space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-gray-800 dark:text-gray-200">
                  {{ run.stats.percent }}% Lulus
                </span>
                <span class="text-gray-500">
                  {{ run.stats.passed }} / {{ run.stats.total }} Tests
                </span>
              </div>

              <!-- Multi-segment progress bar -->
              <div class="w-full h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
                <div
                  v-if="run.stats.passed > 0"
                  class="bg-green-500 h-full"
                  :style="{ width: `${(run.stats.passed / run.stats.total) * 100}%` }"
                  :title="`Passed: ${run.stats.passed}`"
                />
                <div
                  v-if="run.stats.failed > 0"
                  class="bg-red-500 h-full"
                  :style="{ width: `${(run.stats.failed / run.stats.total) * 100}%` }"
                  :title="`Failed: ${run.stats.failed}`"
                />
                <div
                  v-if="run.stats.blocked > 0"
                  class="bg-gray-500 h-full"
                  :style="{ width: `${(run.stats.blocked / run.stats.total) * 100}%` }"
                  :title="`Blocked: ${run.stats.blocked}`"
                />
                <div
                  v-if="run.stats.retest > 0"
                  class="bg-yellow-500 h-full"
                  :style="{ width: `${(run.stats.retest / run.stats.total) * 100}%` }"
                  :title="`Retest: ${run.stats.retest}`"
                />
                <div
                  v-if="run.stats.untested > 0"
                  class="bg-gray-300 dark:bg-gray-700 h-full"
                  :style="{ width: `${(run.stats.untested / run.stats.total) * 100}%` }"
                  :title="`Untested: ${run.stats.untested}`"
                />
              </div>

              <!-- Badges Breakdown -->
              <div class="flex items-center gap-2 text-[11px] text-gray-500 pt-1">
                <span class="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                  <span class="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  {{ run.stats.passed }} Lulus
                </span>
                <span v-if="run.stats.failed > 0" class="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                  <span class="w-2 h-2 rounded-full bg-red-500 inline-block" />
                  {{ run.stats.failed }} Gagal
                </span>
                <span v-if="run.stats.blocked > 0" class="flex items-center gap-1 text-gray-500">
                  <span class="w-2 h-2 rounded-full bg-gray-500 inline-block" />
                  {{ run.stats.blocked }} Blokir
                </span>
                <span v-if="run.stats.untested > 0" class="flex items-center gap-1 text-gray-400">
                  <span class="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                  {{ run.stats.untested }} Belum
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
