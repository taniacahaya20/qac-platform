<script setup lang="ts">
import { apiFetch } from '~/composables/useApi'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const toast = useToast()

const projectId = computed(() => route.params.id as string)
const runId = computed(() => route.params.runId as string)

interface TestResult {
  id: string
  statusId: number
  statusName: string
  statusLabel: string
  statusColor: string
  comment: string | null
  elapsed: number | null
  defects: string | null
  isAutomated: boolean
  errorMessage?: string | null
  stackTrace?: string | null
  createdByName?: string | null
  createdAt: string
}

interface IssueItem {
  id: string
  projectId: string
  runId: string
  testId: string
  caseId: string
  code: string
  title: string
  description: string | null
  actualResult: string | null
  priority: string
  severity: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assignedToName: string | null
  devNotes: string | null
  createdAt: string
  updatedAt: string
}

interface TestItem {
  id: string
  caseId: string
  assignedTo: string | null
  assignedToName: string | null
  caseSnapshot: {
    id: string
    code: string
    title: string
    type?: string
    priority?: string
    template?: string
    preconditions?: string | null
    steps?: { content: string; expected: string }[] | null
    expectedResult?: string | null
    automationKey?: string | null
    automationStatus?: string
  }
  sortOrder: number
  latestResult: TestResult | null
  history: TestResult[]
}

interface RunData {
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
  larkWebhookUrl?: string | null
  larkAppId?: string | null
  larkAppSecret?: string | null
  larkTasklistGuid?: string | null
  stats: {
    total: number
    passed: number
    failed: number
    blocked: number
    retest: number
    untested: number
    percent: number
  }
}

const run = ref<RunData | null>(null)
const testList = ref<TestItem[]>([])
const loading = ref(true)

// Result Recording Modal
const isResultModalOpen = ref(false)
const selectedTest = ref<TestItem | null>(null)
const selectedTestIndex = ref<number>(-1)

const resultForm = reactive({
  statusId: 1, // Passed by default
  comment: '',
  defects: '',
  priority: 'High',
  severity: 'Major',
  assignedToName: '',
  pushToLark: true,
  larkWebhookUrl: '',
  createLarkTask: true,
  larkAppId: '',
  larkAppSecret: '',
})

const submittingResult = ref(false)

// Main tabs: Tests vs Dev Issues
const activeMainTab = ref<'tests' | 'issues'>('tests')
const runIssues = ref<IssueItem[]>([])
const issueSearchQuery = ref('')
const issueStatusFilter = ref<string>('all')

// Dev Note Modal
const isDevNoteModalOpen = ref(false)
const selectedIssueForNote = ref<IssueItem | null>(null)
const devNoteText = ref('')
const savingDevNote = ref(false)

// Detail History Slideover
const isDetailOpen = ref(false)
const viewingTest = ref<TestItem | null>(null)

// Filter
const statusFilter = ref<'all' | number>('all')
const searchQuery = ref('')

async function fetchRunIssues() {
  const res = await apiFetch<IssueItem[]>(`/api/v1/runs/${runId.value}/issues`)
  if (res.data) {
    runIssues.value = res.data
  }
}

async function fetchRunDetail() {
  loading.value = true
  const res = await apiFetch<{ run: RunData; tests: TestItem[] }>(`/api/v1/runs/${runId.value}`)
  if (res.data) {
    run.value = res.data.run
    testList.value = res.data.tests
  }
  await fetchRunIssues()
  loading.value = false
}

onMounted(() => {
  fetchRunDetail()
  if (typeof window !== 'undefined' && window.localStorage) {
    const savedLark = localStorage.getItem('qac_lark_webhook_url')
    if (savedLark) {
      resultForm.larkWebhookUrl = savedLark
    }
    const savedAppId = localStorage.getItem('qac_lark_app_id')
    if (savedAppId) {
      resultForm.larkAppId = savedAppId
    }
    const savedAppSecret = localStorage.getItem('qac_lark_app_secret')
    if (savedAppSecret) {
      resultForm.larkAppSecret = savedAppSecret
    }
  }
})

const filteredTests = computed(() => {
  return testList.value.filter((t) => {
    if (statusFilter.value !== 'all') {
      const currentSt = t.latestResult ? t.latestResult.statusId : 5
      if (currentSt !== statusFilter.value) return false
    }
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      const titleMatch = t.caseSnapshot.title.toLowerCase().includes(q)
      const codeMatch = t.caseSnapshot.code.toLowerCase().includes(q)
      return titleMatch || codeMatch
    }
    return true
  })
})

const filteredIssues = computed(() => {
  return runIssues.value.filter((i) => {
    if (issueStatusFilter.value !== 'all' && i.status !== issueStatusFilter.value) {
      return false
    }
    if (issueSearchQuery.value) {
      const q = issueSearchQuery.value.toLowerCase()
      return (
        i.code.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        (i.assignedToName && i.assignedToName.toLowerCase().includes(q)) ||
        (i.description && i.description.toLowerCase().includes(q))
      )
    }
    return true
  })
})

function getTestIssue(testId: string) {
  return runIssues.value.find((i) => i.testId === testId)
}

function getIssueStatusBadge(status: string) {
  switch (status) {
    case 'open':
      return {
        label: 'Antrian Dev (Baru)',
        color: 'red' as const,
        badgeClass: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800',
      }
    case 'in_progress':
      return {
        label: 'Sedang Dikerjakan Dev',
        color: 'yellow' as const,
        badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
      }
    case 'resolved':
      return {
        label: 'Selesai Diperbaiki (Siap Retest)',
        color: 'green' as const,
        badgeClass: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800',
      }
    case 'closed':
      return {
        label: 'Ditutup (Closed)',
        color: 'gray' as const,
        badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
      }
    default:
      return {
        label: status,
        color: 'gray' as const,
        badgeClass: 'bg-gray-100 text-gray-700',
      }
  }
}

function openAddResult(test: TestItem, index: number, defaultStatus = 1) {
  selectedTest.value = test
  selectedTestIndex.value = index
  resultForm.statusId = defaultStatus
  resultForm.comment = ''
  resultForm.defects = ''
  resultForm.priority = test.caseSnapshot.priority || 'High'
  resultForm.severity = 'Major'
  resultForm.assignedToName = ''
  resultForm.pushToLark = true
  resultForm.createLarkTask = true

  if (typeof window !== 'undefined' && window.localStorage) {
    const savedLark = localStorage.getItem('qac_lark_webhook_url')
    if (savedLark) {
      resultForm.larkWebhookUrl = savedLark
    } else if (run.value?.larkWebhookUrl) {
      resultForm.larkWebhookUrl = run.value.larkWebhookUrl
    }
    const savedAppId = localStorage.getItem('qac_lark_app_id')
    if (savedAppId) {
      resultForm.larkAppId = savedAppId
    } else if (run.value?.larkAppId) {
      resultForm.larkAppId = run.value.larkAppId
    }
    const savedAppSecret = localStorage.getItem('qac_lark_app_secret')
    if (savedAppSecret) {
      resultForm.larkAppSecret = savedAppSecret
    } else if (run.value?.larkAppSecret) {
      resultForm.larkAppSecret = run.value.larkAppSecret
    }
  } else if (run.value?.larkWebhookUrl) {
    resultForm.larkWebhookUrl = run.value.larkWebhookUrl
  }

  const existingIss = getTestIssue(test.id)
  if (existingIss) {
    resultForm.priority = existingIss.priority || 'High'
    resultForm.assignedToName = existingIss.assignedToName || ''
  }

  isResultModalOpen.value = true
}

function openTestDetail(test: TestItem) {
  viewingTest.value = test
  isDetailOpen.value = true
}

async function submitResult(next = false) {
  if (!selectedTest.value) return

  const isFailedOrBlocked = resultForm.statusId === 2 || resultForm.statusId === 3
  const payload: any = {
    statusId: resultForm.statusId,
    comment: resultForm.comment.trim() || undefined,
    defects: resultForm.defects.trim() || undefined,
    priority: resultForm.priority,
    severity: resultForm.severity,
    assignedToName: resultForm.assignedToName.trim() || undefined,
  }

  if (isFailedOrBlocked) {
    if (resultForm.pushToLark) {
      payload.pushToLark = true
      if (resultForm.larkWebhookUrl.trim()) {
        payload.larkWebhookUrl = resultForm.larkWebhookUrl.trim()
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('qac_lark_webhook_url', resultForm.larkWebhookUrl.trim())
        }
      }
    }
    if (resultForm.createLarkTask) {
      payload.createLarkTask = true
      if (resultForm.larkAppId.trim()) {
        payload.larkAppId = resultForm.larkAppId.trim()
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('qac_lark_app_id', resultForm.larkAppId.trim())
        }
      }
      if (resultForm.larkAppSecret.trim()) {
        payload.larkAppSecret = resultForm.larkAppSecret.trim()
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('qac_lark_app_secret', resultForm.larkAppSecret.trim())
        }
      }
    }
  }

  submittingResult.value = true
  const res = await apiFetch<any>(`/api/v1/tests/${selectedTest.value.id}/results`, {
    method: 'POST',
    body: payload,
  })
  submittingResult.value = false

  if (res.data) {
    if (resultForm.statusId === 2) {
      toast.add({ title: 'Kasus Gagal dicatat & otomatis masuk Antrian Issue Dev!', color: 'amber' })
    } else if (resultForm.statusId === 3) {
      toast.add({ title: 'Status Kasus dicatat sebagai Terblokir (Blocked)!', color: 'gray' })
    } else {
      toast.add({ title: 'Hasil pengujian disimpan', color: 'green' })
    }

    if (res.data.lark) {
      if (res.data.lark.success) {
        toast.add({
          title: 'Notifikasi Lark Terkirim! 🚀',
          description: `Alert hasil pengujian (${resultForm.statusId === 2 ? 'FAILED' : 'BLOCKED'}) berhasil di-push ke grup Lark.`,
          color: 'blue',
          icon: 'i-lucide-bell',
        })
      } else {
        toast.add({
          title: 'Lark Push Gagal',
          description: res.data.lark.error || 'Periksa Webhook URL bot Lark.',
          color: 'red',
          icon: 'i-lucide-alert-triangle',
        })
      }
    }

    if (res.data.larkTask) {
      if (res.data.larkTask.success) {
        toast.add({
          title: 'Tiket Lark Task Dibuat! 🎫',
          description: `Tiket baru berhasil diterbitkan di Lark Tasks dengan status Todo.`,
          color: 'green',
          icon: 'i-lucide-check-circle',
        })
      } else {
        toast.add({
          title: 'Lark Task Gagal',
          description: res.data.larkTask.error || 'Periksa App ID & App Secret Lark.',
          color: 'red',
          icon: 'i-lucide-alert-triangle',
        })
      }
    }

    await fetchRunDetail()
    await fetchRunIssues()

    if (next && selectedTestIndex.value >= 0 && selectedTestIndex.value < filteredTests.value.length - 1) {
      const nextIndex = selectedTestIndex.value + 1
      openAddResult(filteredTests.value[nextIndex], nextIndex, 1)
    } else {
      isResultModalOpen.value = false
    }
  } else {
    toast.add({ title: res.error ?? 'Gagal menyimpan hasil', color: 'red' })
  }
}

async function updateDevStatus(issue: IssueItem, newStatus: string) {
  const res = await apiFetch(`/api/v1/runs/issues/${issue.id}`, {
    method: 'PATCH',
    body: { status: newStatus },
  })
  if (res.data) {
    const label =
      newStatus === 'in_progress'
        ? 'Sedang Dikerjakan Dev'
        : newStatus === 'resolved'
        ? 'Selesai Diperbaiki Dev (Siap Retest)'
        : newStatus
    toast.add({ title: `Status issue diubah: ${label}`, color: 'green' })
    await fetchRunIssues()
  } else {
    toast.add({ title: 'Gagal memperbarui status issue', color: 'red' })
  }
}

function openDevNoteModal(issue: IssueItem) {
  selectedIssueForNote.value = issue
  devNoteText.value = issue.devNotes || ''
  isDevNoteModalOpen.value = true
}

async function saveDevNote() {
  if (!selectedIssueForNote.value) return
  savingDevNote.value = true
  const res = await apiFetch(`/api/v1/runs/issues/${selectedIssueForNote.value.id}`, {
    method: 'PATCH',
    body: { devNotes: devNoteText.value.trim() },
  })
  savingDevNote.value = false
  if (res.data) {
    toast.add({ title: 'Catatan dev berhasil disimpan', color: 'green' })
    isDevNoteModalOpen.value = false
    await fetchRunIssues()
  } else {
    toast.add({ title: 'Gagal menyimpan catatan dev', color: 'red' })
  }
}

async function handleCloseRun() {
  if (!confirm('Tutup Test Run ini? Setelah ditutup, hasil pengujian diarsipkan.')) return

  const res = await apiFetch(`/api/v1/runs/${runId.value}/close`, { method: 'POST' })
  if (res.data) {
    toast.add({ title: 'Test Run telah ditutup', color: 'green' })
    fetchRunDetail()
  } else {
    toast.add({ title: res.error ?? 'Gagal menutup test run', color: 'red' })
  }
}

async function handleRerun() {
  if (!confirm('Buat Test Run baru berisi kasus uji yang Gagal atau Perlu Diulang?')) return

  const res = await apiFetch<{ id: string }>(`/api/v1/runs/${runId.value}/rerun`, { method: 'POST' })
  if (res.data) {
    toast.add({ title: 'Test Run baru berhasil dibuat!', color: 'green' })
    router.push(`/projects/${projectId.value}/runs/${res.data.id}`)
  } else {
    toast.add({ title: res.error ?? 'Gagal membuat rerun', color: 'red' })
  }
}

function getStatusBadge(result: TestResult | null) {
  if (!result) return { label: 'Belum Diuji', color: 'gray' as const }
  switch (result.statusId) {
    case 1:
      return { label: 'Passed', color: 'green' as const }
    case 2:
      return { label: 'Failed', color: 'red' as const }
    case 3:
      return { label: 'Blocked', color: 'gray' as const }
    case 4:
      return { label: 'Retest', color: 'yellow' as const }
    default:
      return { label: result.statusLabel || 'Untested', color: 'gray' as const }
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
    <!-- Project Tabs Header -->
    <ProjectTabs :project-id="projectId" active-tab="runs">
      <template #actions>
        <UButton
          :to="`/projects/${projectId}/runs`"
          icon="i-lucide-arrow-left"
          label="Daftar Run"
          variant="ghost"
          size="sm"
        />
        <UButton
          v-if="run && !run.isCompleted"
          icon="i-lucide-check-circle"
          label="Tutup Run"
          color="gray"
          variant="solid"
          size="sm"
          @click="handleCloseRun"
        />
        <UButton
          v-if="run && (run.stats.failed > 0 || run.stats.retest > 0)"
          icon="i-lucide-refresh-cw"
          label="Rerun Failed"
          color="primary"
          size="sm"
          @click="handleRerun"
        />
      </template>
    </ProjectTabs>

    <!-- Main Content -->
    <div v-if="loading" class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-4">
      <USkeleton class="h-32 rounded-xl" />
      <USkeleton class="h-64 rounded-xl" />
    </div>

    <div v-else-if="run" class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
      <!-- Run Overview Banner -->
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-xs">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <UBadge
                :label="run.isCompleted ? 'Selesai' : 'Sedang Berjalan'"
                :color="run.isCompleted ? 'gray' : 'green'"
                variant="subtle"
                size="xs"
              />
              <UBadge
                v-if="run.source === 'automation'"
                label="Playwright Automation"
                color="purple"
                variant="subtle"
                size="xs"
                icon="i-lucide-cpu"
              />
              <span v-if="run.milestoneName" class="text-xs text-gray-500 flex items-center gap-1">
                <UIcon name="i-lucide-flag" class="text-xs" />
                {{ run.milestoneName }}
              </span>
            </div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ run.name }}
            </h1>
            <p v-if="run.description" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ run.description }}
            </p>
          </div>

          <!-- Progress Ring & Numbers -->
          <div class="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <div class="text-center">
              <div class="text-3xl font-extrabold text-primary-600 dark:text-primary-400">
                {{ run.stats.percent }}%
              </div>
              <div class="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Lulus
              </div>
            </div>
            <div class="h-10 w-px bg-gray-200 dark:bg-gray-700" />
            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span class="text-green-600 font-semibold">{{ run.stats.passed }} Passed</span>
              <span class="text-red-600 font-semibold">{{ run.stats.failed }} Failed</span>
              <span class="text-gray-500">{{ run.stats.blocked }} Blocked</span>
              <span class="text-yellow-600 font-medium">{{ run.stats.retest }} Retest</span>
            </div>
          </div>
        </div>

        <!-- Stacked Progress Bar -->
        <div class="mt-4">
          <div class="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
            <div
              v-if="run.stats.passed > 0"
              class="bg-green-500 h-full transition-all"
              :style="{ width: `${(run.stats.passed / run.stats.total) * 100}%` }"
              :title="`Passed: ${run.stats.passed}`"
            />
            <div
              v-if="run.stats.failed > 0"
              class="bg-red-500 h-full transition-all"
              :style="{ width: `${(run.stats.failed / run.stats.total) * 100}%` }"
              :title="`Failed: ${run.stats.failed}`"
            />
            <div
              v-if="run.stats.blocked > 0"
              class="bg-gray-500 h-full transition-all"
              :style="{ width: `${(run.stats.blocked / run.stats.total) * 100}%` }"
              :title="`Blocked: ${run.stats.blocked}`"
            />
            <div
              v-if="run.stats.retest > 0"
              class="bg-yellow-500 h-full transition-all"
              :style="{ width: `${(run.stats.retest / run.stats.total) * 100}%` }"
              :title="`Retest: ${run.stats.retest}`"
            />
            <div
              v-if="run.stats.untested > 0"
              class="bg-gray-300 dark:bg-gray-700 h-full transition-all"
              :style="{ width: `${(run.stats.untested / run.stats.total) * 100}%` }"
              :title="`Untested: ${run.stats.untested}`"
            />
          </div>
        </div>
      </div>

      <!-- Tests Execution & Dev Issues Section -->
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs">
        <!-- Top Navigation Tabs: Kasus Uji vs Antrian Issue Dev -->
        <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 pt-2 bg-gray-50/40 dark:bg-gray-800/20">
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer"
              :class="activeMainTab === 'tests'
                ? 'border-primary-600 text-primary-600 dark:text-primary-400 font-bold bg-white dark:bg-gray-900 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
              @click="activeMainTab = 'tests'"
            >
              <UIcon name="i-lucide-list-checks" class="text-base" />
              <span>Daftar Kasus Uji</span>
              <span class="px-1.5 py-0.5 rounded text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {{ testList.length }}
              </span>
            </button>

            <button
              type="button"
              class="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer"
              :class="activeMainTab === 'issues'
                ? 'border-red-600 text-red-600 dark:text-red-400 font-bold bg-white dark:bg-gray-900 rounded-t-lg'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
              @click="activeMainTab = 'issues'"
            >
              <UIcon name="i-lucide-bug" class="text-base text-red-500" />
              <span>Antrian Issue Dev</span>
              <span
                v-if="runIssues.length > 0"
                class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                :class="runIssues.some(i => i.status === 'open') ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
              >
                {{ runIssues.length }}
              </span>
            </button>
          </div>

          <div v-if="runIssues.filter(i => i.status === 'open').length > 0" class="hidden sm:flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-semibold px-2 py-1 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900/50">
            <UIcon name="i-lucide-alert-triangle" class="text-sm shrink-0" />
            <span>{{ runIssues.filter(i => i.status === 'open').length }} issue perlu diselesaikan developer</span>
          </div>
        </div>

        <!-- VIEW 1: DAFTAR KASUS UJI -->
        <div v-if="activeMainTab === 'tests'">
          <!-- Filter bar -->
          <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <!-- Status filter pill buttons -->
            <div class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              <UButton
                :variant="statusFilter === 'all' ? 'solid' : 'ghost'"
                color="gray"
                size="xs"
                @click="statusFilter = 'all'"
              >
                Semua ({{ testList.length }})
              </UButton>
              <UButton
                :variant="statusFilter === 1 ? 'solid' : 'ghost'"
                color="green"
                size="xs"
                @click="statusFilter = 1"
              >
                Passed ({{ run.stats.passed }})
              </UButton>
              <UButton
                :variant="statusFilter === 2 ? 'solid' : 'ghost'"
                color="red"
                size="xs"
                @click="statusFilter = 2"
              >
                Failed ({{ run.stats.failed }})
              </UButton>
              <UButton
                :variant="statusFilter === 3 ? 'solid' : 'ghost'"
                color="gray"
                size="xs"
                @click="statusFilter = 3"
              >
                Blocked ({{ run.stats.blocked }})
              </UButton>
              <UButton
                :variant="statusFilter === 4 ? 'solid' : 'ghost'"
                color="yellow"
                size="xs"
                @click="statusFilter = 4"
              >
                Retest ({{ run.stats.retest }})
              </UButton>
              <UButton
                :variant="statusFilter === 5 ? 'solid' : 'ghost'"
                color="gray"
                size="xs"
                @click="statusFilter = 5"
              >
                Untested ({{ run.stats.untested }})
              </UButton>
            </div>

            <div class="w-full sm:w-64">
              <UInput
                v-model="searchQuery"
                icon="i-lucide-search"
                placeholder="Cari kode atau judul..."
                size="xs"
              />
            </div>
          </div>

          <!-- Table of Tests (Durasi column removed) -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 text-xs uppercase border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th class="py-3 px-4 w-24 text-left">ID</th>
                  <th class="py-3 px-4 text-left">Judul Kasus Uji</th>
                  <th class="py-3 px-4 w-32 text-left">Status</th>
                  <th class="py-3 px-4 w-36 text-left">Tester</th>
                  <th class="py-3 px-4 w-32 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr
                  v-for="(t, index) in filteredTests"
                  :key="t.id"
                  class="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <!-- Code -->
                  <td class="py-3 px-4 font-mono text-xs font-semibold text-primary-600 align-top">
                    {{ t.caseSnapshot.code }}
                  </td>

                  <!-- Title & Click for Detail -->
                  <td class="py-3 px-4 align-top">
                    <div
                      class="font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer"
                      @click="openTestDetail(t)"
                    >
                      {{ t.caseSnapshot.title }}
                    </div>
                    <div v-if="t.latestResult?.comment" class="text-xs text-gray-400 mt-0.5 line-clamp-1">
                      <span class="font-medium text-gray-500">Catatan:</span> {{ t.latestResult.comment }}
                    </div>
                    <div v-if="t.latestResult?.defects" class="text-xs text-red-500 mt-0.5 flex items-center gap-1 font-mono">
                      <UIcon name="i-lucide-bug" class="text-xs" /> Defect: {{ t.latestResult.defects }}
                    </div>

                    <!-- Auto Dev Issue Link Badge if Failed -->
                    <div v-if="getTestIssue(t.id)" class="mt-1.5 flex items-center gap-2">
                      <span
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer"
                        :class="getIssueStatusBadge(getTestIssue(t.id)!.status).badgeClass"
                        @click="activeMainTab = 'issues'"
                      >
                        <UIcon name="i-lucide-bug" class="text-xs" />
                        <span>{{ getTestIssue(t.id)!.code }}: {{ getIssueStatusBadge(getTestIssue(t.id)!.status).label }}</span>
                      </span>
                      <span v-if="getTestIssue(t.id)?.assignedToName" class="text-[11px] text-gray-400">
                        (Dev: {{ getTestIssue(t.id)!.assignedToName }})
                      </span>
                    </div>
                  </td>

                  <!-- Status Badge -->
                  <td class="py-3 px-4 align-top">
                    <UBadge
                      :label="getStatusBadge(t.latestResult).label"
                      :color="getStatusBadge(t.latestResult).color"
                      size="xs"
                      variant="soft"
                    />
                  </td>

                  <!-- Assignee -->
                  <td class="py-3 px-4 text-xs text-gray-500 align-top">
                    {{ t.assignedToName ?? '—' }}
                  </td>

                  <!-- Action Button -->
                  <td class="py-3 px-4 text-left align-top">
                    <div class="flex items-center justify-start">
                      <UButton
                        icon="i-lucide-plus"
                        label="Hasil"
                        color="primary"
                        variant="soft"
                        size="xs"
                        @click="openAddResult(t, index, t.latestResult?.statusId ?? 1)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- VIEW 2: ANTRIAN ISSUE DEV (DEVELOPER BUG QUEUE) -->
        <div v-else-if="activeMainTab === 'issues'">
          <!-- Issue Filter Bar -->
          <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              <UButton
                :variant="issueStatusFilter === 'all' ? 'solid' : 'ghost'"
                color="gray"
                size="xs"
                @click="issueStatusFilter = 'all'"
              >
                Semua Issue ({{ runIssues.length }})
              </UButton>
              <UButton
                :variant="issueStatusFilter === 'open' ? 'solid' : 'ghost'"
                color="red"
                size="xs"
                @click="issueStatusFilter = 'open'"
              >
                Antrian Baru ({{ runIssues.filter(i => i.status === 'open').length }})
              </UButton>
              <UButton
                :variant="issueStatusFilter === 'in_progress' ? 'solid' : 'ghost'"
                color="yellow"
                size="xs"
                @click="issueStatusFilter = 'in_progress'"
              >
                Sedang Dikerjakan ({{ runIssues.filter(i => i.status === 'in_progress').length }})
              </UButton>
              <UButton
                :variant="issueStatusFilter === 'resolved' ? 'solid' : 'ghost'"
                color="green"
                size="xs"
                @click="issueStatusFilter = 'resolved'"
              >
                Siap Retest ({{ runIssues.filter(i => i.status === 'resolved').length }})
              </UButton>
              <UButton
                :variant="issueStatusFilter === 'closed' ? 'solid' : 'ghost'"
                color="gray"
                size="xs"
                @click="issueStatusFilter = 'closed'"
              >
                Ditutup ({{ runIssues.filter(i => i.status === 'closed').length }})
              </UButton>
            </div>

            <div class="w-full sm:w-64">
              <UInput
                v-model="issueSearchQuery"
                icon="i-lucide-search"
                placeholder="Cari issue bug dev..."
                size="xs"
              />
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredIssues.length === 0" class="p-12 text-center text-gray-400">
            <UIcon name="i-lucide-check-circle-2" class="text-4xl text-green-500 mb-2 inline-block" />
            <div class="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Tidak ada issue developer dalam antrian!
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Jika pengujian ditandai Failed, sistem otomatis mencatat antrian bug di sini untuk diselesaikan developer.
            </p>
          </div>

          <!-- Table of Dev Issues -->
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 text-xs uppercase border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th class="py-3 px-4 w-24 text-left">Kode Issue</th>
                  <th class="py-3 px-4 text-left">Kasus Uji & Temuan Error QA</th>
                  <th class="py-3 px-4 w-28 text-left">Prioritas</th>
                  <th class="py-3 px-4 w-36 text-left">Dev Assignee</th>
                  <th class="py-3 px-4 w-44 text-left">Status Pengerjaan</th>
                  <th class="py-3 px-4 w-52 text-left">Aksi Developer / QA</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr
                  v-for="iss in filteredIssues"
                  :key="iss.id"
                  class="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <!-- Issue Code -->
                  <td class="py-3 px-4 font-mono text-xs font-bold text-red-600 align-top">
                    {{ iss.code }}
                  </td>

                  <!-- Title & Failure Description -->
                  <td class="py-3 px-4 align-top">
                    <div class="font-semibold text-gray-900 dark:text-gray-100">
                      {{ iss.title }}
                    </div>
                    <div v-if="iss.description" class="text-xs text-gray-600 dark:text-gray-400 mt-1 bg-red-50/50 dark:bg-red-950/20 p-2 rounded border border-red-100 dark:border-red-900/30">
                      <span class="font-medium text-red-600">Laporan QA:</span> {{ iss.description }}
                    </div>
                    <div v-if="iss.devNotes" class="text-xs text-gray-600 dark:text-gray-400 mt-1 bg-blue-50/50 dark:bg-blue-950/20 p-2 rounded border border-blue-100 dark:border-blue-900/30">
                      <span class="font-medium text-blue-600">Catatan Dev:</span> {{ iss.devNotes }}
                    </div>
                  </td>

                  <!-- Priority Badge -->
                  <td class="py-3 px-4 align-top">
                    <UBadge
                      :label="iss.priority"
                      :color="iss.priority === 'Critical' ? 'red' : iss.priority === 'High' ? 'orange' : iss.priority === 'Medium' ? 'yellow' : 'gray'"
                      size="xs"
                      variant="subtle"
                    />
                  </td>

                  <!-- Dev Assignee -->
                  <td class="py-3 px-4 text-xs text-gray-600 dark:text-gray-300 align-top">
                    <span v-if="iss.assignedToName" class="font-medium flex items-center gap-1">
                      <UIcon name="i-lucide-user" class="text-xs text-gray-400" />
                      {{ iss.assignedToName }}
                    </span>
                    <span v-else class="text-gray-400 italic">Belum ditugaskan</span>
                  </td>

                  <!-- Issue Status Badge -->
                  <td class="py-3 px-4 align-top">
                    <span
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold"
                      :class="getIssueStatusBadge(iss.status).badgeClass"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :class="iss.status === 'open' ? 'bg-red-500 animate-ping' : iss.status === 'in_progress' ? 'bg-amber-500' : 'bg-green-500'" />
                      {{ getIssueStatusBadge(iss.status).label }}
                    </span>
                  </td>

                  <!-- Action Buttons -->
                  <td class="py-3 px-4 text-left align-top">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <!-- Dev Action: Mulai Kerjakan -->
                      <UButton
                        v-if="iss.status === 'open'"
                        size="2xs"
                        color="yellow"
                        variant="solid"
                        label="Kerjakan"
                        icon="i-lucide-hammer"
                        @click="updateDevStatus(iss, 'in_progress')"
                      />

                      <!-- Dev Action: Tandai Selesai -->
                      <UButton
                        v-if="iss.status === 'in_progress' || iss.status === 'open'"
                        size="2xs"
                        color="green"
                        variant="solid"
                        label="Selesai"
                        icon="i-lucide-check-check"
                        @click="updateDevStatus(iss, 'resolved')"
                      />

                      <!-- Dev Note Button -->
                      <UButton
                        size="2xs"
                        color="gray"
                        variant="soft"
                        label="Catatan"
                        icon="i-lucide-edit-3"
                        @click="openDevNoteModal(iss)"
                      />

                      <!-- Close Issue -->
                      <UButton
                        v-if="iss.status === 'resolved'"
                        size="2xs"
                        color="gray"
                        variant="ghost"
                        label="Tutup"
                        icon="i-lucide-archive"
                        @click="updateDevStatus(iss, 'closed')"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Catat Hasil Pengujian -->
    <UModal v-model="isResultModalOpen">
      <div class="p-6 space-y-4">
        <div class="border-b border-gray-100 dark:border-gray-800 pb-3">
          <div class="text-xs font-mono text-primary-600 font-bold">
            {{ selectedTest?.caseSnapshot.code }}
          </div>
          <h3 class="text-base font-semibold text-gray-900 dark:text-white mt-1">
            {{ selectedTest?.caseSnapshot.title }}
          </h3>
        </div>

        <!-- Steps preview if exists -->
        <div
          v-if="selectedTest?.caseSnapshot.steps && selectedTest.caseSnapshot.steps.length > 0"
          class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-xs space-y-2 max-h-40 overflow-y-auto"
        >
          <div class="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">
            Langkah-Langkah Pengujian:
          </div>
          <div
            v-for="(s, i) in selectedTest.caseSnapshot.steps"
            :key="i"
            class="flex items-start gap-2"
          >
            <span class="w-4 font-bold text-gray-400">{{ i + 1 }}.</span>
            <div>
              <span class="text-gray-800 dark:text-gray-200">{{ s.content }}</span>
              <div v-if="s.expected" class="text-gray-500 dark:text-gray-400 mt-0.5">
                Expected: {{ s.expected }}
              </div>
            </div>
          </div>
        </div>

        <!-- Status Selector -->
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase mb-2">
            Status Pengujian
          </label>
          <div class="grid grid-cols-4 gap-2">
            <button
              type="button"
              class="py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all"
              :class="resultForm.statusId === 1
                ? 'bg-green-500 text-white border-green-600 ring-2 ring-green-400/40'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-950/30'"
              @click="resultForm.statusId = 1"
            >
              Passed (P)
            </button>
            <button
              type="button"
              class="py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all"
              :class="resultForm.statusId === 2
                ? 'bg-red-500 text-white border-red-600 ring-2 ring-red-400/40'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950/30'"
              @click="resultForm.statusId = 2"
            >
              Failed (F)
            </button>
            <button
              type="button"
              class="py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all"
              :class="resultForm.statusId === 3
                ? 'bg-gray-600 text-white border-gray-700 ring-2 ring-gray-400/40'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
              @click="resultForm.statusId = 3"
            >
              Blocked (B)
            </button>
            <button
              type="button"
              class="py-2 px-3 rounded-lg text-xs font-semibold border text-center transition-all"
              :class="resultForm.statusId === 4
                ? 'bg-yellow-500 text-white border-yellow-600 ring-2 ring-yellow-400/40'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-950/30'"
              @click="resultForm.statusId = 4"
            >
              Retest (R)
            </button>
          </div>
        </div>

        <!-- Comment / Catatan Observasi -->
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
            Komentar / Hasil Observasi
          </label>
          <UTextarea
            v-model="resultForm.comment"
            rows="3"
            placeholder="Tuliskan temuan atau catatan eksekusi..."
          />
        </div>

        <!-- Dev Issue Automatic Queue Section (Shown when status is Failed) -->
        <div
          v-if="resultForm.statusId === 2"
          class="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl p-4 space-y-3"
        >
          <div class="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
            <UIcon name="i-lucide-alert-octagon" class="text-base" />
            <span>Otomatis Masuk Antrian Issue Developer</span>
          </div>
          <p class="text-xs text-red-700 dark:text-red-300">
            Kasus uji yang <b>Failed</b> akan langsung dimasukkan ke <b>Antrian Issue Dev</b> agar tim developer segera memperbaiki masalah ini.
          </p>

          <div class="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Prioritas Bug
              </label>
              <USelectMenu
                v-model="resultForm.priority"
                :options="['Critical', 'High', 'Medium', 'Low']"
                size="xs"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Tugaskan Dev (Opsional)
              </label>
              <UInput
                v-model="resultForm.assignedToName"
                placeholder="Contoh: Tim Backend / Dev Karlo"
                size="xs"
              />
            </div>
          </div>
        </div>

        <!-- Lark Integrations Section (Shown when status is Failed or Blocked) -->
        <div
          v-if="resultForm.statusId === 2 || resultForm.statusId === 3"
          class="border border-blue-200/80 dark:border-blue-900/60 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 p-4 space-y-4"
        >
          <div class="flex items-center justify-between border-b border-blue-100 dark:border-blue-900/40 pb-2.5">
            <div class="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">
              <UIcon name="i-lucide-share-2" class="text-base text-blue-600 dark:text-blue-400" />
              <span>Integrasi Lark (Chat Alert & Tiketing Task)</span>
            </div>
            <UBadge
              :label="resultForm.statusId === 2 ? 'Status: FAILED' : 'Status: BLOCKED'"
              :color="resultForm.statusId === 2 ? 'red' : 'gray'"
              size="xs"
              variant="subtle"
            />
          </div>

          <!-- Feature 1: Push Webhook to Group Chat -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                <UIcon name="i-lucide-message-square" class="text-blue-500" />
                <span>1. Kirim Alert ke Grup Chat (Bot Webhook)</span>
              </div>
              <UToggle v-model="resultForm.pushToLark" />
            </div>

            <div v-if="resultForm.pushToLark" class="space-y-1.5 pl-5">
              <UInput
                v-model="resultForm.larkWebhookUrl"
                placeholder="https://open.larksuite.com/open-apis/bot/v2/hook/xxxxxxx-xxxx-xxxx"
                icon="i-lucide-link"
                size="xs"
              />
              <p class="text-[11px] text-gray-400 dark:text-gray-500">
                Webhook URL tersimpan otomatis untuk pengujian berikutnya.
              </p>
            </div>
          </div>

          <!-- Feature 2: Create Ticketing Task in Lark Tasks -->
          <div class="space-y-2 pt-2 border-t border-blue-100/70 dark:border-blue-900/40">
            <div class="flex items-center justify-between">
              <div>
                <div class="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-gray-200">
                  <UIcon name="i-lucide-check-square" class="text-green-500" />
                  <span>2. Buat Tiket di Lark Task (Task List)</span>
                </div>
                <div class="text-[11px] text-gray-500 mt-0.5 pl-5 flex items-center gap-1.5 flex-wrap">
                  <span>Status Tiket:</span>
                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">Todo (Default)</span>
                  <span>➔</span>
                  <span class="text-gray-400">In Progress</span>
                  <span>➔</span>
                  <span class="text-gray-400">In Review</span>
                  <span>➔</span>
                  <span class="text-gray-400">Done</span>
                </div>
              </div>
              <UToggle v-model="resultForm.createLarkTask" />
            </div>

            <div v-if="resultForm.createLarkTask" class="space-y-2.5 pl-5 pt-1">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Lark App ID
                  </label>
                  <UInput
                    v-model="resultForm.larkAppId"
                    placeholder="cli_xxxxxxxx"
                    size="xs"
                  />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    Lark App Secret
                  </label>
                  <UInput
                    v-model="resultForm.larkAppSecret"
                    type="password"
                    placeholder="xxxxxxxx"
                    size="xs"
                  />
                </div>
              </div>
              <p class="text-[11px] text-green-700 dark:text-green-400 flex items-center gap-1">
                <UIcon name="i-lucide-sparkles" class="text-xs" />
                <span>Tiket otomatis masuk ke Task List: <b>QAC Issue Tickets (TMS Karlo)</b></span>
              </p>
            </div>
          </div>
        </div>

        <!-- External Defect Ref (Optional) -->
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">
            ID Defect / Issue Eksternal (Opsional)
          </label>
          <UInput
            v-model="resultForm.defects"
            placeholder="Contoh: JIRA-102 / GITHUB-45"
            size="xs"
          />
        </div>

        <!-- Modal Actions -->
        <div class="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
          <UButton
            variant="ghost"
            color="gray"
            label="Batal"
            @click="isResultModalOpen = false"
          />
          <div class="flex items-center gap-2">
            <UButton
              color="primary"
              variant="outline"
              label="Simpan & Lanjut"
              :loading="submittingResult"
              :disabled="submittingResult || (resultForm.statusId === 2 && !resultForm.comment.trim())"
              @click="submitResult(true)"
            />
            <UButton
              color="primary"
              label="Simpan"
              :loading="submittingResult"
              :disabled="submittingResult || (resultForm.statusId === 2 && !resultForm.comment.trim())"
              @click="submitResult(false)"
            />
          </div>
        </div>
      </div>
    </UModal>

    <!-- Slideover: Test Detail & History Timeline -->
    <USlideover v-model="isDetailOpen">
      <div v-if="viewingTest" class="p-6 h-full flex flex-col space-y-4 overflow-y-auto">
        <div class="border-b border-gray-100 dark:border-gray-800 pb-3">
          <div class="text-xs font-mono text-primary-600 font-bold">
            {{ viewingTest.caseSnapshot.code }}
          </div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white mt-1">
            {{ viewingTest.caseSnapshot.title }}
          </h2>
        </div>

        <!-- Preconditions -->
        <div v-if="viewingTest.caseSnapshot.preconditions" class="text-xs">
          <span class="font-semibold text-gray-500 block mb-1">Prasyarat:</span>
          <p class="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2.5 rounded-lg">
            {{ viewingTest.caseSnapshot.preconditions }}
          </p>
        </div>

        <!-- Steps -->
        <div v-if="viewingTest.caseSnapshot.steps && viewingTest.caseSnapshot.steps.length > 0" class="text-xs">
          <span class="font-semibold text-gray-500 block mb-1">Langkah Pengujian:</span>
          <div class="space-y-2">
            <div
              v-for="(st, i) in viewingTest.caseSnapshot.steps"
              :key="i"
              class="border border-gray-100 dark:border-gray-800 p-2.5 rounded-lg"
            >
              <div class="font-medium text-gray-900 dark:text-white">
                {{ i + 1 }}. {{ st.content }}
              </div>
              <div v-if="st.expected" class="text-gray-500 mt-1">
                Ekspektasi: {{ st.expected }}
              </div>
            </div>
          </div>
        </div>

        <!-- History Timeline -->
        <div class="flex-1 border-t border-gray-100 dark:border-gray-800 pt-4">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Riwayat Hasil Pengujian ({{ viewingTest.history.length }})
          </h3>

          <div v-if="viewingTest.history.length === 0" class="text-xs text-gray-400">
            Belum ada catatan hasil untuk kasus uji ini dalam run ini.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="h in viewingTest.history"
              :key="h.id"
              class="border border-gray-100 dark:border-gray-800 p-3 rounded-lg text-xs space-y-1"
            >
              <div class="flex items-center justify-between">
                <UBadge
                  :label="h.statusLabel || h.statusName"
                  :color="getStatusBadge(h).color"
                  size="xs"
                  variant="subtle"
                />
                <span class="text-gray-400 text-[11px]">{{ formatDate(h.createdAt) }}</span>
              </div>
              <p v-if="h.comment" class="text-gray-800 dark:text-gray-200 mt-1">
                {{ h.comment }}
              </p>
              <div class="flex items-center gap-3 text-gray-400 text-[11px] pt-1">
                <span v-if="h.createdByName">Oleh {{ h.createdByName }}</span>
                <span v-if="h.defects" class="text-red-500 font-mono">Bug: {{ h.defects }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-gray-100 dark:border-gray-800">
          <UButton block label="Tutup" color="gray" @click="isDetailOpen = false" />
        </div>
      </div>
    </USlideover>

    <!-- Modal: Catatan Perbaikan Developer -->
    <UModal v-model="isDevNoteModalOpen">
      <div class="p-6 space-y-4">
        <div class="border-b border-gray-100 dark:border-gray-800 pb-3">
          <div class="text-xs font-mono text-red-600 font-bold">
            {{ selectedIssueForNote?.code }}
          </div>
          <h3 class="text-base font-semibold text-gray-900 dark:text-white mt-1">
            Catatan Perbaikan Developer (Dev Notes)
          </h3>
          <p class="text-xs text-gray-500 mt-0.5">
            {{ selectedIssueForNote?.title }}
          </p>
        </div>

        <div>
          <label class="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1">
            Penjelasan Teknis / Tindakan Perbaikan
          </label>
          <UTextarea
            v-model="devNoteText"
            rows="4"
            placeholder="Contoh: Bug sudah diperbaiki di branch fix/auth-validation. Mohon QA retest kembali."
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <UButton
            variant="ghost"
            color="gray"
            label="Batal"
            @click="isDevNoteModalOpen = false"
          />
          <UButton
            color="primary"
            label="Simpan Catatan"
            :loading="savingDevNote"
            :disabled="!devNoteText.trim() || savingDevNote"
            @click="saveDevNote"
          />
        </div>
      </div>
    </UModal>
  </div>
</template>
