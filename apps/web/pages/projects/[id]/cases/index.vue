<script setup lang="ts">
import { useProjectStore } from '~/stores/projects'
import { useCaseStore } from '~/stores/cases'
import type { TestCase, ProjectModule } from '~/stores/cases'
import { useCaseExport } from '~/composables/useCaseExport'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const toast = useToast()
const projectStore = useProjectStore()
const caseStore = useCaseStore()
const { exportToExcel, exportToCsv, exportToPdf } = useCaseExport()

const projectId = computed(() => route.params.id as string)

// Modals
const isCreateCaseOpen = ref(false)
const isDetailSlideoverOpen = ref(false)
const isModuleModalOpen = ref(false)
const isEditingCase = ref(false)
const editingCaseId = ref<string | null>(null)

// Left Card: Modul Sistem Minimize & Hover-Expand state
const isModuleMinimized = ref(false)
const isModuleHovered = ref(false)
const isModuleExpanded = computed(() => !isModuleMinimized.value || isModuleHovered.value)

function toggleModuleMinimize() {
  isModuleMinimized.value = !isModuleMinimized.value
  if (import.meta.client) {
    localStorage.setItem('qac_module_card_minimized', String(isModuleMinimized.value))
  }
}

// Master Module Form
const moduleForm = reactive({
  name: '',
  code: '',
  description: '',
})
const isCreatingModule = ref(false)

// Test Case Form (Revisi 13 field)
const caseForm = reactive({
  moduleId: '',
  actor: 'Superadmin',
  condition: 'Positif Case',
  code: '',
  title: '',
  description: '',
  preconditions: '',
  steps: [{ content: '', expected: '' }],
  expectedResult: '',
  testData: '',
  notes: '',
  priority: 'Medium',
  type: 'Functional',
  sectionId: '',
})

// Preset Options
const conditionOptions = [
  { label: 'Positif Case', value: 'Positif Case' },
  { label: 'Negatif Case', value: 'Negatif Case' },
  { label: 'Edge Case', value: 'Edge Case' },
  { label: 'Network Case', value: 'Network Case' },
]

const actorOptions = ref<string[]>([
  'Superadmin',
  'Admin',
  'Shipper',
  'Transporter',
  'Driver',
  'Finance',
  'Customer Support',
  'Guest / Public',
])

const statusDataOptions = [
  { label: 'Pass', value: 'Pass' },
  { label: 'Fail', value: 'Fail' },
]

const priorityOptions = ['Critical', 'High', 'Medium', 'Low']
const typeOptions = ['Functional', 'Smoke', 'Regression', 'Security', 'Performance', 'Usability', 'Other']

onMounted(async () => {
  if (import.meta.client) {
    const saved = localStorage.getItem('qac_module_card_minimized')
    if (saved !== null) {
      isModuleMinimized.value = saved === 'true'
    }
  }

  if (!projectStore.currentProject || projectStore.currentProject.id !== projectId.value) {
    await projectStore.fetchProject(projectId.value)
  }
  await caseStore.fetchModules(projectId.value)
  await caseStore.fetchSections(projectId.value)
  await caseStore.fetchCases(projectId.value)

  // Fetch dynamic actors
  const actorRes = await apiFetch<Array<{ name: string }>>('/api/v1/actors')
  if (actorRes.data && actorRes.data.length > 0) {
    const names = actorRes.data.map((a) => a.name)
    actorOptions.value = Array.from(new Set([...names, ...actorOptions.value]))
  }
})

// Filter by Left Tab Module
async function selectModuleTab(moduleId: string | null) {
  caseStore.selectedModuleId = moduleId
  await caseStore.fetchCases(projectId.value)
}

// Auto-generate Module Code when typing module name
function handleModuleNameInput() {
  if (!moduleForm.code || moduleForm.code.length <= 4) {
    const cleaned = moduleForm.name.trim().replace(/[^a-zA-Z0-9\s]/g, '')
    const words = cleaned.split(/\s+/).filter(Boolean)
    if (words.length === 1) {
      moduleForm.code = words[0].slice(0, 4).toUpperCase()
    } else if (words.length >= 2) {
      if (words[1].length >= 4) {
        moduleForm.code = words[1].slice(0, 4).toUpperCase()
      } else {
        moduleForm.code = (words[0].slice(0, 2) + words[1].slice(0, 2)).toUpperCase()
      }
    }
  }
}

// When Module changes in Create Case modal, auto-generate TestCase ID
async function handleModuleChange(modId: string) {
  caseForm.moduleId = modId
  if (modId) {
    const nextId = await caseStore.getNextCaseId(projectId.value, modId)
    if (nextId) {
      caseForm.code = nextId
    }
  }
}

// Dynamic Steps
function addStep() {
  caseForm.steps.push({ content: '', expected: '' })
}

function removeStep(index: number) {
  if (caseForm.steps.length > 1) {
    caseForm.steps.splice(index, 1)
  }
}

// Open Create Case Modal
async function openCreateCaseModal() {
  isEditingCase.value = false
  editingCaseId.value = null

  // Default to currently selected module tab if any
  const defaultModId = caseStore.selectedModuleId || (caseStore.modules[0]?.id ?? '')

  caseForm.moduleId = defaultModId
  caseForm.actor = 'Superadmin'
  caseForm.condition = 'Positif Case'
  caseForm.code = ''
  caseForm.title = ''
  caseForm.description = ''
  caseForm.preconditions = ''
  caseForm.steps = [{ content: '', expected: '' }]
  caseForm.expectedResult = ''
  caseForm.testData = ''
  caseForm.notes = ''
  caseForm.priority = 'Medium'
  caseForm.type = 'Functional'
  caseForm.sectionId = caseStore.sections[0]?.id || ''

  if (defaultModId) {
    const nextId = await caseStore.getNextCaseId(projectId.value, defaultModId)
    caseForm.code = nextId
  }

  isCreateCaseOpen.value = true
}

// Open Edit Case Modal
function openEditCaseModal(c: TestCase) {
  if (c.isLocked) {
    toast.add({
      title: 'Kasus Uji Terkunci',
      description: 'Kasus uji tidak dapat diedit karena sudah pernah masuk dalam Run Case.',
      color: 'amber',
    })
    return
  }

  isEditingCase.value = true
  editingCaseId.value = c.id
  caseForm.moduleId = c.moduleId || ''
  caseForm.actor = c.actor || 'Superadmin'
  caseForm.condition = c.condition || 'Positif Case'
  caseForm.code = c.code
  caseForm.title = c.title
  caseForm.description = c.description || ''
  caseForm.preconditions = c.preconditions || ''
  caseForm.steps = c.steps && c.steps.length > 0 ? JSON.parse(JSON.stringify(c.steps)) : [{ content: '', expected: '' }]
  caseForm.expectedResult = c.expectedResult || ''
  caseForm.testData = c.testData || ''
  caseForm.notes = c.notes || ''
  caseForm.priority = c.priority || 'Medium'
  caseForm.type = c.type || 'Functional'
  caseForm.sectionId = c.sectionId || ''
  isCreateCaseOpen.value = true
}

const isCaseFormValid = computed(() => {
  return (
    !!caseForm.moduleId &&
    !!caseForm.code?.trim() &&
    !!caseForm.actor?.trim() &&
    !!caseForm.condition?.trim() &&
    !!caseForm.title?.trim()
  )
})

// Save Test Case
async function saveCase() {
  if (!caseForm.title.trim()) {
    toast.add({ title: 'Judul test case wajib diisi', color: 'red' })
    return
  }

  const payload = {
    moduleId: caseForm.moduleId || undefined,
    actor: caseForm.actor,
    condition: caseForm.condition,
    code: caseForm.code.trim() || undefined,
    title: caseForm.title.trim(),
    description: caseForm.description.trim() || undefined,
    preconditions: caseForm.preconditions.trim() || undefined,
    steps: caseForm.steps.filter((s) => s.content.trim().length > 0),
    expectedResult: caseForm.expectedResult.trim() || undefined,
    testData: caseForm.testData.trim() || undefined,
    notes: caseForm.notes.trim() || undefined,
    priority: caseForm.priority,
    type: caseForm.type,
    sectionId: caseForm.sectionId || undefined,
  }

  if (isEditingCase.value && editingCaseId.value) {
    const res = await caseStore.updateCase(editingCaseId.value, projectId.value, payload)
    if (res.error) {
      toast.add({ title: 'Gagal memperbarui test case', description: res.error, color: 'red' })
    } else {
      toast.add({ title: 'Test case berhasil diperbarui', color: 'green' })
      isCreateCaseOpen.value = false
    }
  } else {
    const res = await caseStore.createCase(projectId.value, payload)
    if (res.error) {
      toast.add({ title: 'Gagal membuat test case', description: res.error, color: 'red' })
    } else {
      toast.add({ title: 'Test case berhasil dibuat', color: 'green' })
      isCreateCaseOpen.value = false
    }
  }
}

// Save New Master Module
async function saveModule() {
  if (!moduleForm.name.trim()) {
    toast.add({ title: 'Nama modul wajib diisi', color: 'red' })
    return
  }

  isCreatingModule.value = true
  const res = await caseStore.createModule(projectId.value, {
    name: moduleForm.name.trim(),
    code: moduleForm.code.trim() || undefined,
    description: moduleForm.description.trim() || undefined,
  })
  isCreatingModule.value = false

  if (res.data) {
    toast.add({ title: 'Master modul berhasil ditambahkan', color: 'green' })
    isModuleModalOpen.value = false
    moduleForm.name = ''
    moduleForm.code = ''
    moduleForm.description = ''
  } else {
    toast.add({ title: res.error ?? 'Gagal membuat modul', color: 'red' })
  }
}

// Delete Case
async function handleDeleteCase(c: TestCase) {
  if (!confirm(`Hapus kasus uji "${c.code} - ${c.title}"?`)) return
  const res = await caseStore.deleteCase(c.id, projectId.value)
  if (res.error) {
    toast.add({ title: 'Gagal menghapus kasus uji', description: res.error, color: 'red' })
  } else {
    toast.add({ title: 'Kasus uji berhasil dihapus', color: 'green' })
  }
}

// Open Case Detail
async function openCaseDetail(c: TestCase) {
  await caseStore.fetchCaseDetail(c.id)
  isDetailSlideoverOpen.value = true
}

// Active Module Info
const currentActiveModule = computed(() => {
  if (!caseStore.selectedModuleId) return null
  return caseStore.modules.find((m) => m.id === caseStore.selectedModuleId) ?? null
})

// Export Handlers
const exportDropdownItems = [
  [
    {
      label: 'Export ke Excel (.xlsx)',
      icon: 'i-lucide-file-spreadsheet',
      click: () => {
        const title = currentActiveModule.value?.name || 'Semua_Modul'
        exportToExcel(title, caseStore.cases)
        toast.add({ title: 'File Excel (.xlsx) berhasil diunduh', color: 'green' })
      },
    },
    {
      label: 'Export ke CSV (.csv)',
      icon: 'i-lucide-file-text',
      click: () => {
        const title = currentActiveModule.value?.name || 'Semua_Modul'
        exportToCsv(title, caseStore.cases)
        toast.add({ title: 'File CSV (.csv) berhasil diunduh', color: 'green' })
      },
    },
    {
      label: 'Export ke PDF (.pdf)',
      icon: 'i-lucide-file',
      click: () => {
        const title = currentActiveModule.value?.name || 'Semua_Modul'
        exportToPdf(title, caseStore.cases)
        toast.add({ title: 'Dokumen PDF berhasil diunduh', color: 'green' })
      },
    },
  ],
]

function getConditionBadge(cond?: string | null) {
  switch (cond) {
    case 'Positif Case': return { color: 'green' as const, label: 'Positif' }
    case 'Negatif Case': return { color: 'red' as const, label: 'Negatif' }
    case 'Edge Case': return { color: 'amber' as const, label: 'Edge Case' }
    case 'Network Case': return { color: 'purple' as const, label: 'Network' }
    default: return { color: 'gray' as const, label: cond || '-' }
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
    <!-- Top Project Navigation Header -->
    <ProjectTabs :project-id="projectId" active-tab="cases" />

    <!-- Main Workspace with Left Module Tab Bar & Right Cases Table -->
    <div class="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
      
      <!-- LEFT TABULATION BAR: MODUL MASTER DATA (COLLAPSIBLE & HOVER-EXPANDABLE) -->
      <aside
        class="shrink-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xs flex flex-col h-[calc(100vh-10rem)] sticky top-20 overflow-hidden transition-all duration-300 ease-in-out select-none"
        :class="[
          isModuleExpanded ? 'w-80' : 'w-16',
          isModuleMinimized && isModuleHovered ? 'z-30 shadow-2xl ring-2 ring-primary-500/30' : 'z-10'
        ]"
        @mouseenter="isModuleMinimized ? (isModuleHovered = true) : null"
        @mouseleave="isModuleHovered = false"
      >
        <!-- Module Header -->
        <div class="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-800/40">
          <div v-if="isModuleExpanded" class="flex items-center gap-2 min-w-0">
            <UIcon name="i-lucide-layers" class="text-primary-600 text-lg shrink-0" />
            <h3 class="font-bold text-gray-900 dark:text-white text-sm truncate">Modul Sistem</h3>
            <UBadge
              v-if="isModuleMinimized && isModuleHovered"
              label="Hover"
              color="amber"
              variant="subtle"
              size="2xs"
            />
          </div>
          <div v-else class="w-full flex justify-center">
            <UIcon
              name="i-lucide-layers"
              class="text-primary-600 text-xl cursor-pointer hover:scale-110 transition-transform"
              title="Modul Sistem (Hover untuk expand)"
            />
          </div>

          <!-- Header Actions -->
          <div v-if="isModuleExpanded" class="flex items-center gap-1">
            <UButton
              icon="i-lucide-plus"
              size="2xs"
              color="primary"
              variant="soft"
              label="Modul"
              title="Tambah Modul"
              @click="isModuleModalOpen = true"
            />
            <UButton
              :icon="isModuleMinimized ? 'i-lucide-pin' : 'i-lucide-panel-left-close'"
              size="2xs"
              color="gray"
              variant="ghost"
              :title="isModuleMinimized ? 'Pin / Pertahankan Buka' : 'Minimize Card Modul Sistem'"
              @click="toggleModuleMinimize"
            />
          </div>
        </div>

        <!-- CONTENT WHEN EXPANDED (Full View) -->
        <div v-if="isModuleExpanded" class="flex-1 overflow-y-auto p-2 space-y-1">
          <!-- All Modules Item -->
          <div
            class="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            :class="!caseStore.selectedModuleId
              ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold shadow-xs'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
            @click="selectModuleTab(null)"
          >
            <div class="flex items-center gap-2.5">
              <UIcon name="i-lucide-boxes" class="text-sm" />
              <span>Semua Modul</span>
            </div>
            <UBadge
              :label="String(caseStore.totalCases)"
              color="gray"
              variant="subtle"
              size="xs"
            />
          </div>

          <!-- Divider -->
          <div class="px-2 pt-2 pb-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
            Master Modul ({{ caseStore.modules.length }})
          </div>

          <!-- Module List Items -->
          <div
            v-for="mod in caseStore.modules"
            :key="mod.id"
            class="flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-all group"
            :class="caseStore.selectedModuleId === mod.id
              ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-semibold ring-1 ring-primary-500/30'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
            @click="selectModuleTab(mod.id)"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span
                class="font-mono text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
                :class="caseStore.selectedModuleId === mod.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50'"
              >
                {{ mod.code }}
              </span>
              <span class="truncate">{{ mod.name }}</span>
            </div>
            <UBadge
              :label="String(mod.caseCount)"
              :color="caseStore.selectedModuleId === mod.id ? 'primary' : 'gray'"
              variant="subtle"
              size="xs"
              class="shrink-0"
            />
          </div>
        </div>

        <!-- CONTENT WHEN MINIMIZED (Compact Icons & Badges with Tooltips) -->
        <div v-else class="flex-1 overflow-y-auto p-1.5 space-y-2 flex flex-col items-center">
          <!-- All Modules Icon button -->
          <UTooltip text="Semua Modul" :popper="{ placement: 'right' }">
            <button
              type="button"
              class="w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer relative"
              :class="!caseStore.selectedModuleId
                ? 'bg-primary-500 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
              @click="selectModuleTab(null)"
            >
              <UIcon name="i-lucide-boxes" class="text-base" />
              <span class="text-[9px] font-bold">{{ caseStore.totalCases }}</span>
            </button>
          </UTooltip>

          <div class="w-8 h-px bg-gray-200 dark:bg-gray-800" />

          <!-- Module Code buttons -->
          <div
            v-for="mod in caseStore.modules"
            :key="mod.id"
            class="w-full flex justify-center"
          >
            <UTooltip :text="`${mod.code} — ${mod.name} (${mod.caseCount} kasus)`" :popper="{ placement: 'right' }">
              <button
                type="button"
                class="w-10 h-9 rounded-lg flex flex-col items-center justify-center font-mono font-bold text-[10px] transition-all cursor-pointer relative"
                :class="caseStore.selectedModuleId === mod.id
                  ? 'bg-primary-600 text-white shadow-xs ring-2 ring-primary-400/40'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-950/50 hover:text-primary-600'"
                @click="selectModuleTab(mod.id)"
              >
                {{ mod.code }}
                <span class="text-[8px] font-sans font-normal opacity-80">{{ mod.caseCount }}</span>
              </button>
            </UTooltip>
          </div>
        </div>

        <!-- Footer Quick Action -->
        <div v-if="isModuleExpanded" class="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <UButton
            block
            icon="i-lucide-plus"
            label="Tambah Modul Baru"
            size="xs"
            variant="ghost"
            color="primary"
            @click="isModuleModalOpen = true"
          />
        </div>
        <div v-else class="p-2 border-t border-gray-100 dark:border-gray-800 flex justify-center">
          <UTooltip text="Tambah Modul Baru" :popper="{ placement: 'right' }">
            <UButton
              icon="i-lucide-plus"
              size="2xs"
              variant="ghost"
              color="primary"
              @click="isModuleModalOpen = true"
            />
          </UTooltip>
        </div>
      </aside>

      <!-- RIGHT PANEL: TEST CASES LIST TABLE & EXPORT BAR -->
      <main class="flex-1 min-w-0 space-y-4">
        
        <!-- Module Banner & Action Bar -->
        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-xs">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <!-- Left Info -->
            <div>
              <div class="flex items-center gap-2">
                <UBadge
                  v-if="currentActiveModule"
                  :label="currentActiveModule.code"
                  color="primary"
                  size="sm"
                  variant="solid"
                  class="font-mono font-bold"
                />
                <h2 class="text-lg font-bold text-gray-900 dark:text-white">
                  {{ currentActiveModule ? currentActiveModule.name : 'Semua Kasus Uji' }}
                </h2>
                <span class="text-xs text-gray-500">
                  ({{ caseStore.cases.length }} Kasus Uji)
                </span>
              </div>
              <p v-if="currentActiveModule?.description" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{ currentActiveModule.description }}
              </p>
            </div>

            <!-- Action Buttons: Export & Create Case -->
            <div class="flex items-center gap-2 shrink-0">
              <!-- Export Dropdown -->
              <UDropdown :items="exportDropdownItems" :popper="{ placement: 'bottom-end' }">
                <UButton
                  icon="i-lucide-download"
                  label="Export Modul"
                  color="gray"
                  variant="outline"
                  size="sm"
                  trailing-icon="i-lucide-chevron-down"
                />
              </UDropdown>

              <!-- Run Case Button -->
              <UButton
                :to="`/projects/${projectId}/runs/new`"
                icon="i-lucide-play"
                label="Run Case"
                color="green"
                size="sm"
                title="Mulai Run Case baru untuk proyek ini"
              />

              <!-- Create Case Button -->
              <UButton
                icon="i-lucide-plus"
                label="Buat Test Case Baru"
                color="primary"
                size="sm"
                @click="openCreateCaseModal"
              />
            </div>
          </div>

          <!-- Filter & Search Sub-bar -->
          <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
            <!-- Condition Filter Pills -->
            <div class="flex items-center gap-1.5 overflow-x-auto text-xs">
              <span class="text-gray-400 text-xs font-medium mr-1">Condition:</span>
              <button
                type="button"
                class="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                :class="!caseStore.filters.condition ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'"
                @click="caseStore.filters.condition = ''; caseStore.fetchCases(projectId)"
              >
                Semua
              </button>
              <button
                v-for="c in conditionOptions"
                :key="c.value"
                type="button"
                class="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                :class="caseStore.filters.condition === c.value ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'"
                @click="caseStore.filters.condition = c.value; caseStore.fetchCases(projectId)"
              >
                {{ c.label }}
              </button>
            </div>

            <!-- Search input -->
            <div class="w-full sm:w-64">
              <UInput
                v-model="caseStore.filters.search"
                icon="i-lucide-search"
                size="xs"
                placeholder="Cari ID, judul, atau aktor..."
                @update:model-value="caseStore.fetchCases(projectId)"
              />
            </div>
          </div>
        </div>

        <!-- Cases Table -->
        <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs">
          <!-- Loading -->
          <div v-if="caseStore.isLoading" class="p-6 space-y-3">
            <USkeleton class="h-10 rounded-lg" />
            <USkeleton class="h-10 rounded-lg" />
            <USkeleton class="h-10 rounded-lg" />
          </div>

          <!-- Empty State -->
          <div
            v-else-if="caseStore.cases.length === 0"
            class="text-center py-16 px-4"
          >
            <UIcon name="i-lucide-file-x-2" class="text-5xl text-gray-300 dark:text-gray-600 mb-3" />
            <h4 class="font-bold text-gray-800 dark:text-gray-200 text-base mb-1">
              Tidak ada kasus uji
            </h4>
            <p class="text-xs text-gray-500 max-w-sm mx-auto mb-4">
              Belum ada kasus uji yang dibuat di modul ini. Buat kasus uji pertama Anda sekarang.
            </p>
            <UButton
              icon="i-lucide-plus"
              label="Buat Test Case Baru"
              color="primary"
              size="sm"
              @click="openCreateCaseModal"
            />
          </div>

          <!-- Table of Cases -->
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-50/75 dark:bg-gray-800/60 text-gray-500 uppercase border-b border-gray-200 dark:border-gray-800 font-semibold tracking-wider">
                <tr>
                  <th class="py-3 px-3.5 w-24">TestCase ID</th>
                  <th class="py-3 px-3.5 w-24">Modul</th>
                  <th class="py-3 px-3.5 w-28">Actor</th>
                  <th class="py-3 px-3.5 w-28">Condition</th>
                  <th class="py-3 px-3.5">Judul Kasus Uji</th>
                  <th class="py-3 px-3.5 w-24">Status</th>
                  <th class="py-3 px-3.5 w-24 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr
                  v-for="c in caseStore.cases"
                  :key="c.id"
                  class="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors group cursor-pointer"
                  @click="openCaseDetail(c)"
                >
                  <!-- TestCase ID -->
                  <td class="py-3 px-3.5 font-mono font-bold text-primary-600 dark:text-primary-400">
                    {{ c.code }}
                  </td>

                  <!-- Modul Badge -->
                  <td class="py-3 px-3.5">
                    <span class="font-mono text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                      {{ c.moduleCode || 'GEN' }}
                    </span>
                  </td>

                  <!-- Actor -->
                  <td class="py-3 px-3.5">
                    <UBadge
                      :label="c.actor || 'Superadmin'"
                      color="blue"
                      variant="subtle"
                      size="xs"
                    />
                  </td>

                  <!-- Condition -->
                  <td class="py-3 px-3.5">
                    <UBadge
                      :label="getConditionBadge(c.condition).label"
                      :color="getConditionBadge(c.condition).color"
                      variant="subtle"
                      size="xs"
                    />
                  </td>

                  <!-- Title & Description preview -->
                  <td class="py-3 px-3.5">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">
                        {{ c.title }}
                      </span>
                      <UBadge
                        v-if="c.isLocked"
                        label="Terkunci (Run Case)"
                        color="amber"
                        variant="subtle"
                        size="2xs"
                        icon="i-lucide-lock"
                        title="Kasus uji ini sudah masuk dalam Run Case dan tidak dapat diedit"
                      />
                    </div>
                    <div v-if="c.description" class="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                      {{ c.description }}
                    </div>
                  </td>

                  <!-- Status Data -->
                  <td class="py-3 px-3.5">
                    <UBadge
                      :label="c.statusData === 'Passed' ? 'Passed' : c.statusData === 'Failed' ? 'Failed' : 'Belum Diuji'"
                      :color="c.statusData === 'Passed' ? 'green' : c.statusData === 'Failed' ? 'red' : 'gray'"
                      size="xs"
                      variant="soft"
                    />
                  </td>

                  <!-- Actions (Disabled if isLocked) -->
                  <td class="py-3 px-3.5 text-right" @click.stop>
                    <div class="flex items-center justify-end gap-1">
                      <UTooltip :text="c.isLocked ? 'Terkunci: Kasus uji sudah masuk dalam Run Case (tidak bisa diedit)' : 'Edit Kasus Uji'">
                        <UButton
                          :icon="c.isLocked ? 'i-lucide-lock' : 'i-lucide-pencil'"
                          variant="ghost"
                          :color="c.isLocked ? 'amber' : 'gray'"
                          size="2xs"
                          :disabled="c.isLocked"
                          @click="openEditCaseModal(c)"
                        />
                      </UTooltip>
                      <UTooltip :text="c.isLocked ? 'Terkunci: Kasus uji tidak bisa dihapus karena sudah di-run case' : 'Hapus Kasus Uji'">
                        <UButton
                          icon="i-lucide-trash-2"
                          variant="ghost"
                          color="red"
                          size="2xs"
                          :disabled="c.isLocked"
                          @click="handleDeleteCase(c)"
                        />
                      </UTooltip>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>

    <!-- MODAL 1: BUAT TEST CASE BARU (13 FIELD REVISI LENGKAP) -->
    <UModal v-model="isCreateCaseOpen" :ui="{ width: 'sm:max-w-3xl' }">
      <div class="p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              {{ isEditingCase ? 'Edit Test Case' : 'Buat Test Case Baru' }}
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              Lengkapi informasi pengujian terstruktur berdasarkan modul master data.
            </p>
          </div>
          <UButton
            icon="i-lucide-x"
            color="gray"
            variant="ghost"
            size="xs"
            @click="isCreateCaseOpen = false"
          />
        </div>

        <form class="space-y-4" @submit.prevent="saveCase">
          <!-- Row 1: Modul & TestCase ID -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/40 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
            <!-- Field Modul -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                  Modul <span class="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  class="text-[11px] text-primary-600 hover:underline flex items-center gap-0.5"
                  @click="isModuleModalOpen = true"
                >
                  <UIcon name="i-lucide-plus" class="text-xs" /> Baru
                </button>
              </div>
              <USelectMenu
                v-model="caseForm.moduleId"
                :options="caseStore.modules.map(m => ({ label: `${m.code} — ${m.name}`, value: m.id }))"
                value-attribute="value"
                option-attribute="label"
                placeholder="Pilih Modul Master..."
                @update:model-value="handleModuleChange"
              />
            </div>

            <!-- Field TestCase ID (Auto-generated from Module Code) -->
            <div>
              <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                TestCase ID <span class="text-red-500">*</span>
              </label>
              <div class="flex items-center gap-2">
                <UInput
                  v-model="caseForm.code"
                  placeholder="Contoh: AUTH-001"
                  class="flex-1 font-mono font-bold"
                  required
                />
                <UButton
                  icon="i-lucide-refresh-cw"
                  variant="soft"
                  color="gray"
                  size="xs"
                  title="Generate Ulang ID"
                  @click="handleModuleChange(caseForm.moduleId)"
                />
              </div>
            </div>
          </div>

          <!-- Row 2: Actor & Condition -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Field Actor -->
            <div>
              <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Actor / Pengguna <span class="text-red-500">*</span>
              </label>
              <USelectMenu
                v-model="caseForm.actor"
                :options="actorOptions"
                placeholder="Pilih atau ketik Actor..."
              />
            </div>

            <!-- Field Condition -->
            <div>
              <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Condition <span class="text-red-500">*</span>
              </label>
              <USelectMenu
                v-model="caseForm.condition"
                :options="conditionOptions"
                value-attribute="value"
                option-attribute="label"
              />
            </div>
          </div>

          <!-- Row 3: Judul & TestCase Description -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Judul Skenario Kasus Uji <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="caseForm.title"
              placeholder="Contoh: Login berhasil dengan email terdaftar dan password valid"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
              TestCase Description
            </label>
            <UTextarea
              v-model="caseForm.description"
              rows="2"
              placeholder="Deskripsi detail apa yang diuji dalam testcase ini..."
            />
          </div>

          <!-- Row 4: Pre-Condition -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Pre-Condition
            </label>
            <UTextarea
              v-model="caseForm.preconditions"
              rows="2"
              placeholder="Kondisi awal yang harus dipenuhi (contoh: User sudah terdaftar dan status aktif)..."
            />
          </div>

          <!-- Row 5: Dynamic Scenario / Step (Tambah baris field dinamis) -->
          <div class="border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 space-y-3 bg-gray-50/50 dark:bg-gray-900/50">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase flex items-center gap-1.5">
                <UIcon name="i-lucide-list-ordered" class="text-primary-600 text-sm" />
                Scenario / Steps
              </label>
              <UButton
                icon="i-lucide-plus"
                size="2xs"
                color="primary"
                variant="soft"
                label="Tambah Step"
                @click="addStep"
              />
            </div>

            <div class="space-y-2">
              <div
                v-for="(step, idx) in caseForm.steps"
                :key="idx"
                class="flex items-start gap-2 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700"
              >
                <span class="w-6 font-mono font-bold text-xs text-gray-400 mt-2 text-center">
                  {{ idx + 1 }}.
                </span>
                <div class="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <UInput
                    v-model="step.content"
                    size="xs"
                    placeholder="Tindakan / Langkah (Action)..."
                  />
                  <UInput
                    v-model="step.expected"
                    size="xs"
                    placeholder="Ekspektasi Langkah (Opsional)..."
                  />
                </div>
                <UButton
                  icon="i-lucide-trash-2"
                  color="red"
                  variant="ghost"
                  size="2xs"
                  class="mt-1"
                  :disabled="caseForm.steps.length <= 1"
                  @click="removeStep(idx)"
                />
              </div>
            </div>
          </div>

          <!-- Row 6: Expected Result & Test Data -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Expected Result
              </label>
              <UTextarea
                v-model="caseForm.expectedResult"
                rows="2"
                placeholder="Hasil yang diharapkan sistem secara keseluruhan..."
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Test Data
              </label>
              <UTextarea
                v-model="caseForm.testData"
                rows="2"
                placeholder="Data masukan pengujian (email: x@x.com, pass: 123, id: 9)..."
              />
            </div>
          </div>

          <!-- Row 7: Notes -->
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Notes (Catatan Tambahan)
            </label>
            <UTextarea
              v-model="caseForm.notes"
              rows="2"
              placeholder="Catatan tambahan untuk tester atau developer..."
            />
          </div>

          <!-- Modal Actions -->
          <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <UButton
              variant="ghost"
              color="gray"
              label="Batal"
              @click="isCreateCaseOpen = false"
            />
            <UButton
              type="submit"
              color="primary"
              :label="isEditingCase ? 'Simpan Perubahan' : 'Buat Test Case'"
              :disabled="!isCaseFormValid"
            />
          </div>
        </form>
      </div>
    </UModal>

    <!-- MODAL 2: MASTER DATA MODUL (CRUD MODUL & GENERATOR KODE SINGKATAN) -->
    <UModal v-model="isModuleModalOpen">
      <div class="p-6 space-y-4">
        <div class="border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">
              Master Data Modul
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">
              Tambah modul baru untuk mengelompokkan testcase dan mengenerate kode singkatan.
            </p>
          </div>
          <UButton
            icon="i-lucide-x"
            color="gray"
            variant="ghost"
            size="xs"
            @click="isModuleModalOpen = false"
          />
        </div>

        <!-- Add Module Form -->
        <form class="space-y-3" @submit.prevent="saveModule">
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Nama Modul <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="moduleForm.name"
              placeholder="Contoh: Vendor Management, Payment Gateway"
              required
              @input="handleModuleNameInput"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Kode Singkatan Modul <span class="text-red-500">*</span>
              </label>
              <UInput
                v-model="moduleForm.code"
                placeholder="Contoh: VND, PAY"
                class="font-mono font-bold uppercase"
                required
              />
              <span class="text-[10px] text-gray-400">Digunakan untuk format TestCase ID (e.g. VND-001)</span>
            </div>

            <div>
              <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Deskripsi
              </label>
              <UInput
                v-model="moduleForm.description"
                placeholder="Cakupan modul..."
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <UButton
              variant="ghost"
              color="gray"
              label="Tutup"
              @click="isModuleModalOpen = false"
            />
            <UButton
              type="submit"
              color="primary"
              label="Tambah Modul"
              :loading="isCreatingModule"
              :disabled="!moduleForm.name.trim() || !moduleForm.code.trim() || isCreatingModule"
            />
          </div>
        </form>

        <!-- Existing Modules List -->
        <div class="border-t border-gray-100 dark:border-gray-800 pt-3">
          <h4 class="text-xs font-bold text-gray-500 uppercase mb-2">
            Modul Terdaftar ({{ caseStore.modules.length }})
          </h4>
          <div class="space-y-1.5 max-h-48 overflow-y-auto">
            <div
              v-for="m in caseStore.modules"
              :key="m.id"
              class="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-xs"
            >
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300">
                  {{ m.code }}
                </span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ m.name }}</span>
              </div>
              <span class="text-gray-400 text-[11px]">{{ m.caseCount }} Kasus Uji</span>
            </div>
          </div>
        </div>
      </div>
    </UModal>

    <!-- SLIDEOVER: DETAIL KASUS UJI LENGKAP -->
    <USlideover v-model="isDetailSlideoverOpen">
      <div v-if="caseStore.selectedCase" class="p-6 h-full flex flex-col space-y-4 overflow-y-auto text-xs">
        <div class="border-b border-gray-100 dark:border-gray-800 pb-3 flex items-start justify-between">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="font-mono font-bold text-sm text-primary-600 dark:text-primary-400">
                {{ caseStore.selectedCase.code }}
              </span>
              <UBadge
                :label="caseStore.selectedCase.moduleCode || 'Modul'"
                color="primary"
                size="xs"
                variant="subtle"
              />
              <UBadge
                :label="caseStore.selectedCase.statusData === 'Passed' ? 'Passed' : caseStore.selectedCase.statusData === 'Failed' ? 'Failed' : 'Belum Diuji'"
                :color="caseStore.selectedCase.statusData === 'Passed' ? 'green' : caseStore.selectedCase.statusData === 'Failed' ? 'red' : 'gray'"
                size="xs"
              />
              <UBadge
                v-if="caseStore.selectedCase.isLocked"
                label="Terkunci (Run Case)"
                color="amber"
                size="xs"
                variant="subtle"
                icon="i-lucide-lock"
              />
            </div>
            <h3 class="text-base font-bold text-gray-900 dark:text-white">
              {{ caseStore.selectedCase.title }}
            </h3>
          </div>
          <UTooltip :text="caseStore.selectedCase.isLocked ? 'Terkunci: Kasus uji sudah di-run case (tidak bisa diedit)' : 'Edit Kasus Uji'">
            <UButton
              :icon="caseStore.selectedCase.isLocked ? 'i-lucide-lock' : 'i-lucide-pencil'"
              size="xs"
              :color="caseStore.selectedCase.isLocked ? 'amber' : 'gray'"
              variant="ghost"
              :disabled="caseStore.selectedCase.isLocked"
              @click="openEditCaseModal(caseStore.selectedCase); isDetailSlideoverOpen = false"
            />
          </UTooltip>
        </div>

        <!-- Lock Warning Notice if isLocked -->
        <div v-if="caseStore.selectedCase.isLocked" class="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <UIcon name="i-lucide-lock" class="text-base text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span class="font-bold block">Kasus Uji Terkunci (Sudah di-Run Case)</span>
            Kasus uji ini telah masuk dalam Run Case dan terkunci dari pengeditan untuk menjaga integritas data pengujian historis.
          </div>
        </div>

        <!-- Meta row -->
        <div class="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg text-xs">
          <div>
            <span class="text-gray-400 block text-[10px] uppercase font-bold">Actor:</span>
            <span class="font-medium text-gray-800 dark:text-gray-200">{{ caseStore.selectedCase.actor || 'Superadmin' }}</span>
          </div>
          <div>
            <span class="text-gray-400 block text-[10px] uppercase font-bold">Condition:</span>
            <span class="font-medium text-gray-800 dark:text-gray-200">{{ caseStore.selectedCase.condition || 'Positif Case' }}</span>
          </div>
        </div>

        <!-- Description -->
        <div v-if="caseStore.selectedCase.description">
          <span class="text-gray-400 font-bold uppercase block mb-1">Deskripsi:</span>
          <p class="text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-2 rounded">
            {{ caseStore.selectedCase.description }}
          </p>
        </div>

        <!-- Preconditions -->
        <div v-if="caseStore.selectedCase.preconditions">
          <span class="text-gray-400 font-bold uppercase block mb-1">Pre-Condition:</span>
          <p class="text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-2 rounded">
            {{ caseStore.selectedCase.preconditions }}
          </p>
        </div>

        <!-- Steps -->
        <div v-if="caseStore.selectedCase.steps && caseStore.selectedCase.steps.length > 0">
          <span class="text-gray-400 font-bold uppercase block mb-1">Scenario / Steps:</span>
          <div class="space-y-1.5">
            <div
              v-for="(st, i) in caseStore.selectedCase.steps"
              :key="i"
              class="border border-gray-100 dark:border-gray-800 p-2 rounded bg-white dark:bg-gray-800/40"
            >
              <div class="font-medium text-gray-900 dark:text-white">
                {{ i + 1 }}. {{ st.content }}
              </div>
              <div v-if="st.expected" class="text-gray-500 text-[11px] mt-0.5">
                Expected: {{ st.expected }}
              </div>
            </div>
          </div>
        </div>

        <!-- Expected Result -->
        <div v-if="caseStore.selectedCase.expectedResult">
          <span class="text-gray-400 font-bold uppercase block mb-1">Expected Result:</span>
          <p class="text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-2 rounded">
            {{ caseStore.selectedCase.expectedResult }}
          </p>
        </div>

        <!-- Test Data -->
        <div v-if="caseStore.selectedCase.testData">
          <span class="text-gray-400 font-bold uppercase block mb-1">Test Data:</span>
          <p class="font-mono text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-2 rounded">
            {{ caseStore.selectedCase.testData }}
          </p>
        </div>

        <!-- Notes -->
        <div v-if="caseStore.selectedCase.notes">
          <span class="text-gray-400 font-bold uppercase block mb-1">Notes:</span>
          <p class="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
            {{ caseStore.selectedCase.notes }}
          </p>
        </div>

        <div class="pt-4 border-t border-gray-100 dark:border-gray-800">
          <UButton block label="Tutup" color="gray" @click="isDetailSlideoverOpen = false" />
        </div>
      </div>
    </USlideover>
  </div>
</template>
