<script setup lang="ts">
import { apiFetch } from '~/composables/useApi'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const projectId = computed(() => route.params.id as string)

interface ReportSummary {
  totalRuns: number
  distribution: {
    passed: number
    failed: number
    blocked: number
    retest: number
    untested: number
  }
  coverage: {
    total: number
    automated: number
    percentage: number
  }
  runTrends: {
    runId: string
    runName: string
    date: string
    total: number
    passed: number
    failed: number
    passRate: number
  }[]
  flakyTests: {
    caseId: string
    caseTitle: string
    caseCode: string
    passedCount: number
    failedCount: number
  }[]
}

const summary = ref<ReportSummary | null>(null)
const loading = ref(true)

async function fetchReportSummary() {
  loading.value = true
  const res = await apiFetch<ReportSummary>(`/api/v1/projects/${projectId.value}/reports/summary`)
  if (res.data) {
    summary.value = res.data
  }
  loading.value = false
}

onMounted(() => {
  fetchReportSummary()
})

const totalResults = computed(() => {
  if (!summary.value) return 0
  const d = summary.value.distribution
  return d.passed + d.failed + d.blocked + d.retest + d.untested
})

const overallPassRate = computed(() => {
  if (!summary.value || totalResults.value === 0) return 0
  return Math.round((summary.value.distribution.passed / totalResults.value) * 100)
})

function exportToCSV() {
  if (!summary.value) return
  let csv = 'Run Name,Date,Total Tests,Passed,Failed,Pass Rate %\n'
  for (const r of summary.value.runTrends) {
    csv += `"${r.runName}",${r.date},${r.total},${r.passed},${r.failed},${r.passRate}%\n`
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `qac-report-${projectId.value}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div class="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
    <ProjectTabs :project-id="projectId" active-tab="reports">
      <template #actions>
        <UButton
          icon="i-lucide-download"
          label="Export CSV"
          color="gray"
          variant="outline"
          size="sm"
          @click="exportToCSV"
        />
      </template>
    </ProjectTabs>

    <div class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
      <div v-if="loading" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <USkeleton class="h-28 rounded-xl" />
          <USkeleton class="h-28 rounded-xl" />
          <USkeleton class="h-28 rounded-xl" />
          <USkeleton class="h-28 rounded-xl" />
        </div>
        <USkeleton class="h-64 rounded-xl" />
      </div>

      <div v-else-if="summary" class="space-y-6">
        <!-- Metric Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Overall Pass Rate -->
          <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-xs">
            <div class="flex items-center justify-between text-gray-500 mb-2">
              <span class="text-xs uppercase font-semibold">Tingkat Kelulusan</span>
              <UIcon name="i-lucide-check-circle-2" class="text-green-500 text-lg" />
            </div>
            <div class="text-3xl font-extrabold text-gray-900 dark:text-white">
              {{ overallPassRate }}%
            </div>
            <div class="text-xs text-gray-500 mt-1">
              {{ summary.distribution.passed }} dari {{ totalResults }} total eksekusi
            </div>
          </div>

          <!-- Total Runs -->
          <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-xs">
            <div class="flex items-center justify-between text-gray-500 mb-2">
              <span class="text-xs uppercase font-semibold">Total Test Runs</span>
              <UIcon name="i-lucide-play-circle" class="text-blue-500 text-lg" />
            </div>
            <div class="text-3xl font-extrabold text-gray-900 dark:text-white">
              {{ summary.totalRuns }}
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Eksekusi manual dan automated
            </div>
          </div>

          <!-- Automation Coverage -->
          <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-xs">
            <div class="flex items-center justify-between text-gray-500 mb-2">
              <span class="text-xs uppercase font-semibold">Automation Coverage</span>
              <UIcon name="i-lucide-cpu" class="text-purple-500 text-lg" />
            </div>
            <div class="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
              {{ summary.coverage.percentage }}%
            </div>
            <div class="text-xs text-gray-500 mt-1">
              {{ summary.coverage.automated }} dari {{ summary.coverage.total }} kasus uji otomatis
            </div>
          </div>

          <!-- Flaky Tests Detected -->
          <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-xs">
            <div class="flex items-center justify-between text-gray-500 mb-2">
              <span class="text-xs uppercase font-semibold">Flaky Tests</span>
              <UIcon name="i-lucide-alert-triangle" class="text-amber-500 text-lg" />
            </div>
            <div class="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {{ summary.flakyTests.length }}
            </div>
            <div class="text-xs text-gray-500 mt-1">
              Kasus uji inkonsisten (lulus lalu gagal)
            </div>
          </div>
        </div>

        <!-- Status Distribution Bar -->
        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-xs space-y-4">
          <h3 class="font-bold text-gray-900 dark:text-white text-base">
            Distribusi Status Hasil Pengujian
          </h3>

          <div class="w-full h-4 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
            <div
              v-if="summary.distribution.passed > 0"
              class="bg-green-500 h-full"
              :style="{ width: `${(summary.distribution.passed / totalResults) * 100}%` }"
              :title="`Passed: ${summary.distribution.passed}`"
            />
            <div
              v-if="summary.distribution.failed > 0"
              class="bg-red-500 h-full"
              :style="{ width: `${(summary.distribution.failed / totalResults) * 100}%` }"
              :title="`Failed: ${summary.distribution.failed}`"
            />
            <div
              v-if="summary.distribution.blocked > 0"
              class="bg-gray-500 h-full"
              :style="{ width: `${(summary.distribution.blocked / totalResults) * 100}%` }"
              :title="`Blocked: ${summary.distribution.blocked}`"
            />
            <div
              v-if="summary.distribution.retest > 0"
              class="bg-yellow-500 h-full"
              :style="{ width: `${(summary.distribution.retest / totalResults) * 100}%` }"
              :title="`Retest: ${summary.distribution.retest}`"
            />
            <div
              v-if="summary.distribution.untested > 0"
              class="bg-gray-300 dark:bg-gray-700 h-full"
              :style="{ width: `${(summary.distribution.untested / totalResults) * 100}%` }"
              :title="`Untested: ${summary.distribution.untested}`"
            />
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded bg-green-500 shrink-0" />
              <div>
                <div class="font-semibold text-gray-900 dark:text-white">{{ summary.distribution.passed }} Passed</div>
                <div class="text-[11px] text-gray-400">{{ Math.round((summary.distribution.passed / totalResults) * 100) }}%</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded bg-red-500 shrink-0" />
              <div>
                <div class="font-semibold text-gray-900 dark:text-white">{{ summary.distribution.failed }} Failed</div>
                <div class="text-[11px] text-gray-400">{{ Math.round((summary.distribution.failed / totalResults) * 100) }}%</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded bg-gray-500 shrink-0" />
              <div>
                <div class="font-semibold text-gray-900 dark:text-white">{{ summary.distribution.blocked }} Blocked</div>
                <div class="text-[11px] text-gray-400">{{ Math.round((summary.distribution.blocked / totalResults) * 100) }}%</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded bg-yellow-500 shrink-0" />
              <div>
                <div class="font-semibold text-gray-900 dark:text-white">{{ summary.distribution.retest }} Retest</div>
                <div class="text-[11px] text-gray-400">{{ Math.round((summary.distribution.retest / totalResults) * 100) }}%</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded bg-gray-400 shrink-0" />
              <div>
                <div class="font-semibold text-gray-900 dark:text-white">{{ summary.distribution.untested }} Untested</div>
                <div class="text-[11px] text-gray-400">{{ Math.round((summary.distribution.untested / totalResults) * 100) }}%</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Run Trends Table -->
        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs">
          <div class="p-4 border-b border-gray-100 dark:border-gray-800">
            <h3 class="font-bold text-gray-900 dark:text-white text-base">
              Tren Pass Rate antar Test Run
            </h3>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 text-xs uppercase border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th class="py-3 px-4">Nama Test Run</th>
                  <th class="py-3 px-4 w-32">Tanggal</th>
                  <th class="py-3 px-4 w-28">Total Tests</th>
                  <th class="py-3 px-4 w-28 text-green-600">Passed</th>
                  <th class="py-3 px-4 w-28 text-red-600">Failed</th>
                  <th class="py-3 px-4 w-44">Pass Rate</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr
                  v-for="r in summary.runTrends"
                  :key="r.runId"
                  class="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td class="py-3 px-4 font-medium text-gray-900 dark:text-white">
                    <NuxtLink :to="`/projects/${projectId}/runs/${r.runId}`" class="hover:text-primary-600">
                      {{ r.runName }}
                    </NuxtLink>
                  </td>
                  <td class="py-3 px-4 text-xs text-gray-500">{{ r.date }}</td>
                  <td class="py-3 px-4 text-xs">{{ r.total }}</td>
                  <td class="py-3 px-4 text-xs font-semibold text-green-600">{{ r.passed }}</td>
                  <td class="py-3 px-4 text-xs font-semibold text-red-600">{{ r.failed }}</td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          class="h-full rounded-full transition-all"
                          :class="r.passRate >= 80 ? 'bg-green-500' : r.passRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'"
                          :style="{ width: `${r.passRate}%` }"
                        />
                      </div>
                      <span class="text-xs font-semibold font-mono w-10 text-right">{{ r.passRate }}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Flaky Tests Table -->
        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs">
          <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 class="font-bold text-gray-900 dark:text-white text-base">
                Deteksi Flaky Tests
              </h3>
              <p class="text-xs text-gray-500 mt-0.5">
                Kasus uji yang pernah lulus dan pernah gagal di run yang berbeda (indikasi uji tidak stabil atau race condition).
              </p>
            </div>
            <UBadge
              :label="`${summary.flakyTests.length} Terdeteksi`"
              color="amber"
              variant="subtle"
              size="xs"
            />
          </div>

          <div v-if="summary.flakyTests.length === 0" class="p-6 text-center text-sm text-gray-500">
            Tidak ada flaky test yang terdeteksi! Semua pengujian konsisten.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 text-xs uppercase border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th class="py-3 px-4 w-24">Kode</th>
                  <th class="py-3 px-4">Judul Kasus Uji</th>
                  <th class="py-3 px-4 w-32 text-green-600">Jumlah Lulus</th>
                  <th class="py-3 px-4 w-32 text-red-600">Jumlah Gagal</th>
                  <th class="py-3 px-4 w-36">Status Stabilitas</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr
                  v-for="flaky in summary.flakyTests"
                  :key="flaky.caseId"
                  class="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td class="py-3 px-4 font-mono text-xs font-semibold text-primary-600">
                    {{ flaky.caseCode }}
                  </td>
                  <td class="py-3 px-4 font-medium text-gray-900 dark:text-white">
                    {{ flaky.caseTitle }}
                  </td>
                  <td class="py-3 px-4 text-xs font-semibold text-green-600">
                    {{ flaky.passedCount }}x Lulus
                  </td>
                  <td class="py-3 px-4 text-xs font-semibold text-red-600">
                    {{ flaky.failedCount }}x Gagal
                  </td>
                  <td class="py-3 px-4">
                    <UBadge label="Flaky" color="amber" size="xs" variant="soft" icon="i-lucide-alert-triangle" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
