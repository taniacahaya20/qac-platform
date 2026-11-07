<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useStatusStore } from '~/stores/statuses'
import { apiFetch } from '~/composables/useApi'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Dashboard' })

const { t } = useI18n()
const authStore = useAuthStore()
const statusStore = useStatusStore()

interface DashboardData {
  activeRuns: number
  myTodo: Array<{
    testId: string
    runId: string
    runName: string
    projectId: string
    caseTitle: string
    caseCode: string
  }>
  recentActivity: Array<{
    id: string
    action: string
    entity: string
    entityId: string
    meta: Record<string, unknown> | null
    createdAt: string
    userName: string
    userId: string
  }>
  activityChart: Array<{
    date: string
    statusId: number
    statusName: string
    statusColor: string
    count: number
  }>
}

const dashboard = ref<DashboardData | null>(null)
const isLoading = ref(true)

onMounted(async () => {
  await statusStore.fetchStatuses()
  const result = await apiFetch<DashboardData>('/api/v1/reports/dashboard')
  if (result.data) dashboard.value = result.data
  isLoading.value = false
})

const activityIconMap: Record<string, string> = {
  create: 'i-lucide-plus-circle',
  update: 'i-lucide-edit',
  delete: 'i-lucide-trash-2',
  close: 'i-lucide-check-square',
  rerun: 'i-lucide-refresh-cw',
}

function getActivityIcon(action: string) {
  return activityIconMap[action] ?? 'i-lucide-activity'
}

function formatAction(action: string, entity: string) {
  const actionMap: Record<string, string> = {
    create: 'membuat',
    update: 'memperbarui',
    delete: 'menghapus',
    close: 'menutup',
    rerun: 'menjalankan ulang',
  }
  const entityMap: Record<string, string> = {
    project: 'proyek',
    case: 'test case',
    run: 'test run',
    result: 'hasil test',
    milestone: 'milestone',
  }
  return `${actionMap[action] ?? action} ${entityMap[entity] ?? entity}`
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ t('dashboard.title') }}
      </h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">
        Halo, <strong>{{ authStore.user?.name }}</strong> 👋
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <USkeleton v-for="i in 3" :key="i" class="h-24 rounded-xl" />
    </div>

    <template v-else-if="dashboard">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <UCard>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center">
              <UIcon name="i-lucide-play-circle" class="text-blue-600 text-2xl" />
            </div>
            <div>
              <p class="text-sm text-gray-500">{{ t('dashboard.activeRuns') }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ dashboard.activeRuns }}
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-amber-50 dark:bg-amber-950 rounded-xl flex items-center justify-center">
              <UIcon name="i-lucide-clipboard-list" class="text-amber-600 text-2xl" />
            </div>
            <div>
              <p class="text-sm text-gray-500">{{ t('dashboard.myTodo') }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ dashboard.myTodo.length }}
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-green-50 dark:bg-green-950 rounded-xl flex items-center justify-center">
              <UIcon name="i-lucide-activity" class="text-green-600 text-2xl" />
            </div>
            <div>
              <p class="text-sm text-gray-500">Aktivitas Hari Ini</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ dashboard.activityChart.filter(a => a.date === new Date().toISOString().split('T')[0]).reduce((s, a) => s + Number(a.count), 0) }}
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Todo List -->
        <div class="lg:col-span-1">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{ t('dashboard.myTodo') }}
                </h3>
                <UBadge :label="String(dashboard.myTodo.length)" color="blue" variant="soft" />
              </div>
            </template>

            <div v-if="dashboard.myTodo.length === 0" class="text-center py-8 text-gray-400">
              <UIcon name="i-lucide-check-circle-2" class="text-4xl mb-2" />
              <p class="text-sm">{{ t('dashboard.noTodo') }}</p>
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="todo in dashboard.myTodo"
                :key="todo.testId"
                class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                @click="navigateTo(`/projects/${todo.projectId}/runs/${todo.runId}`)"
              >
                <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center shrink-0 mt-0.5">
                  <span class="text-xs font-mono text-gray-600 dark:text-gray-300">{{ todo.caseCode }}</span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {{ todo.caseTitle }}
                  </p>
                  <p class="text-xs text-gray-400 truncate">{{ todo.runName }}</p>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Recent Activity -->
        <div class="lg:col-span-2">
          <UCard>
            <template #header>
              <h3 class="font-semibold text-gray-900 dark:text-white">
                {{ t('dashboard.recentActivity') }}
              </h3>
            </template>

            <div v-if="dashboard.recentActivity.length === 0" class="text-center py-8 text-gray-400">
              <UIcon name="i-lucide-clock" class="text-4xl mb-2" />
              <p class="text-sm">{{ t('dashboard.noActivity') }}</p>
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="activity in dashboard.recentActivity"
                :key="activity.id"
                class="flex items-start gap-3"
              >
                <div class="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <UIcon :name="getActivityIcon(activity.action)" class="text-gray-500 text-sm" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-700 dark:text-gray-300">
                    <span class="font-medium">{{ activity.userName }}</span>
                    {{ ' ' }}{{ formatAction(activity.action, activity.entity) }}
                  </p>
                  <p class="text-xs text-gray-400 mt-0.5">{{ timeAgo(activity.createdAt) }}</p>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <div v-else class="text-center py-16 text-gray-400">
      <UIcon name="i-lucide-alert-circle" class="text-5xl mb-4" />
      <p>Gagal memuat data dashboard</p>
    </div>
  </div>
</template>
