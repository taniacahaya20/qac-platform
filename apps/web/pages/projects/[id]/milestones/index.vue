<script setup lang="ts">
import { apiFetch } from '~/composables/useApi'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const toast = useToast()
const projectId = computed(() => route.params.id as string)

interface MilestoneItem {
  id: string
  projectId: string
  parentId: string | null
  name: string
  description: string | null
  startDate: string | null
  dueDate: string | null
  isCompleted: boolean
  completedAt: string | null
  createdAt: string
  runCount: number
  totalTests: number
  passedTests: number
  percent: number
}

const milestones = ref<MilestoneItem[]>([])
const loading = ref(true)
const isModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  name: '',
  description: '',
  startDate: '',
  dueDate: '',
})

const submitting = ref(false)

async function fetchMilestones() {
  loading.value = true
  const res = await apiFetch<MilestoneItem[]>(`/api/v1/projects/${projectId.value}/milestones`)
  if (res.data) {
    milestones.value = res.data
  }
  loading.value = false
}

onMounted(() => {
  fetchMilestones()
})

function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  form.name = ''
  form.description = ''
  form.startDate = ''
  form.dueDate = ''
  isModalOpen.value = true
}

function openEditModal(m: MilestoneItem) {
  isEditing.value = true
  editingId.value = m.id
  form.name = m.name
  form.description = m.description || ''
  form.startDate = m.startDate || ''
  form.dueDate = m.dueDate || ''
  isModalOpen.value = true
}

async function handleSubmit() {
  if (!form.name.trim()) {
    toast.add({ title: 'Nama milestone wajib diisi', color: 'red' })
    return
  }

  submitting.value = true
  let res
  if (isEditing.value && editingId.value) {
    res = await apiFetch(`/api/v1/milestones/${editingId.value}`, {
      method: 'PATCH',
      body: {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        startDate: form.startDate || undefined,
        dueDate: form.dueDate || undefined,
      },
    })
  } else {
    res = await apiFetch(`/api/v1/projects/${projectId.value}/milestones`, {
      method: 'POST',
      body: {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        startDate: form.startDate || undefined,
        dueDate: form.dueDate || undefined,
      },
    })
  }
  submitting.value = false

  if (res.data) {
    toast.add({
      title: isEditing.value ? 'Milestone diperbarui' : 'Milestone berhasil dibuat',
      color: 'green',
    })
    isModalOpen.value = false
    fetchMilestones()
  } else {
    toast.add({ title: res.error ?? 'Terjadi kesalahan', color: 'red' })
  }
}

async function toggleComplete(m: MilestoneItem) {
  const res = await apiFetch(`/api/v1/milestones/${m.id}`, {
    method: 'PATCH',
    body: {
      isCompleted: !m.isCompleted,
    },
  })
  if (res.data) {
    toast.add({
      title: m.isCompleted ? 'Milestone dibuka kembali' : 'Milestone ditandai selesai',
      color: 'green',
    })
    fetchMilestones()
  }
}

async function handleDelete(m: MilestoneItem) {
  if (!confirm(`Hapus milestone "${m.name}"?`)) return

  const res = await apiFetch(`/api/v1/milestones/${m.id}`, { method: 'DELETE' })
  if (res.data) {
    toast.add({ title: 'Milestone dihapus', color: 'green' })
    fetchMilestones()
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
    <ProjectTabs :project-id="projectId" active-tab="milestones">
      <template #actions>
        <UButton
          icon="i-lucide-plus"
          label="Tambah Milestone"
          color="primary"
          size="sm"
          @click="openCreateModal"
        />
      </template>
    </ProjectTabs>

    <div class="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
      <div v-if="loading" class="space-y-4">
        <USkeleton class="h-28 rounded-xl" />
        <USkeleton class="h-28 rounded-xl" />
      </div>

      <div
        v-else-if="milestones.length === 0"
        class="text-center py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl"
      >
        <UIcon name="i-lucide-flag" class="text-5xl text-gray-400 mb-3" />
        <h3 class="font-semibold text-gray-800 dark:text-gray-200 text-lg mb-1">
          Belum ada Milestone
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
          Kelompokkan test run berdasarkan target rilis perangkat lunak seperti Sprint, Beta, atau Major Release.
        </p>
        <UButton
          icon="i-lucide-plus"
          label="Buat Milestone Pertama"
          color="primary"
          @click="openCreateModal"
        />
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="m in milestones"
          :key="m.id"
          class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4"
        >
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <UBadge
                :label="m.isCompleted ? 'Selesai' : 'Aktif'"
                :color="m.isCompleted ? 'gray' : 'green'"
                variant="subtle"
                size="xs"
              />
              <div class="flex items-center gap-1">
                <UButton
                  icon="i-lucide-pencil"
                  variant="ghost"
                  color="gray"
                  size="2xs"
                  title="Edit"
                  @click="openEditModal(m)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  color="red"
                  size="2xs"
                  title="Hapus"
                  @click="handleDelete(m)"
                />
              </div>
            </div>

            <h3 class="font-bold text-gray-900 dark:text-white text-base">
              {{ m.name }}
            </h3>
            <p v-if="m.description" class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              {{ m.description }}
            </p>

            <div class="flex items-center gap-4 text-xs text-gray-400 mt-3">
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-calendar" class="text-xs" />
                Mulai: {{ formatDate(m.startDate) }}
              </span>
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-calendar-clock" class="text-xs" />
                Jatuh Tempo: {{ formatDate(m.dueDate) }}
              </span>
            </div>
          </div>

          <!-- Progress -->
          <div class="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-500">{{ m.runCount }} Test Run</span>
              <span class="font-semibold text-primary-600 dark:text-primary-400">
                {{ m.percent }}% ({{ m.passedTests }} / {{ m.totalTests }} Tests)
              </span>
            </div>

            <div class="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                class="bg-green-500 h-full rounded-full transition-all"
                :style="{ width: `${m.percent}%` }"
              />
            </div>

            <div class="flex items-center justify-end pt-1">
              <UButton
                :icon="m.isCompleted ? 'i-lucide-rotate-ccw' : 'i-lucide-check'"
                :label="m.isCompleted ? 'Buka Kembali' : 'Tandai Selesai'"
                variant="ghost"
                color="gray"
                size="xs"
                @click="toggleComplete(m)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <UModal v-model="isModalOpen">
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
          {{ isEditing ? 'Edit Milestone' : 'Tambah Milestone Baru' }}
        </h3>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Nama Milestone <span class="text-red-500">*</span>
            </label>
            <UInput v-model="form.name" placeholder="Contoh: Sprint 4, Release v2.0" required />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Deskripsi
            </label>
            <UTextarea v-model="form.description" rows="2" placeholder="Tujuan atau cakupan release..." />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Tanggal Mulai
              </label>
              <UInput v-model="form.startDate" type="date" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Jatuh Tempo
              </label>
              <UInput v-model="form.dueDate" type="date" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <UButton variant="ghost" color="gray" label="Batal" @click="isModalOpen = false" />
            <UButton
              type="submit"
              color="primary"
              :label="isEditing ? 'Simpan' : 'Buat'"
              :loading="submitting"
              :disabled="!form.name.trim() || submitting"
            />
          </div>
        </form>
      </div>
    </UModal>
  </div>
</template>
