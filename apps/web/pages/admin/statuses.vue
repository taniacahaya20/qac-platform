<script setup lang="ts">
import { apiFetch } from '~/composables/useApi'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Kustomisasi Status — Admin' })

const authStore = useAuthStore()
const toast = useToast()

interface StatusItem {
  id: number
  name: string
  label: string
  color: string
  isFinal: boolean
  isDefault: boolean
  isSystem: boolean
  sortOrder: number
}

const statuses = ref<StatusItem[]>([])
const loading = ref(true)
const isModalOpen = ref(false)
const editingStatus = ref<StatusItem | null>(null)

const form = reactive({
  label: '',
  color: '#22c55e',
})

const submitting = ref(false)

async function fetchStatuses() {
  loading.value = true
  const res = await apiFetch<StatusItem[]>('/api/v1/statuses')
  if (res.data) {
    statuses.value = res.data
  }
  loading.value = false
}

onMounted(() => {
  if (!authStore.isAdmin) {
    navigateTo('/')
    return
  }
  fetchStatuses()
})

function openEdit(s: StatusItem) {
  editingStatus.value = s
  form.label = s.label
  form.color = s.color
  isModalOpen.value = true
}

async function handleSave() {
  if (!editingStatus.value) return

  submitting.value = true
  const res = await apiFetch(`/api/v1/statuses/${editingStatus.value.id}`, {
    method: 'PATCH',
    body: {
      label: form.label.trim(),
      color: form.color,
    },
  })
  submitting.value = false

  if (res.data) {
    toast.add({ title: 'Status berhasil diperbarui', color: 'green' })
    isModalOpen.value = false
    fetchStatuses()
  } else {
    toast.add({ title: res.error ?? 'Gagal memperbarui status', color: 'red' })
  }
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <NuxtLink to="/admin" class="text-xs text-gray-500 hover:text-primary-600">
            Administrasi
          </NuxtLink>
          <span class="text-xs text-gray-400">/</span>
          <span class="text-xs text-gray-900 dark:text-white font-semibold">Status</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Kustomisasi Status Pengujian
        </h1>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs">
      <div v-if="loading" class="p-6 space-y-3">
        <USkeleton class="h-10 rounded-lg" />
        <USkeleton class="h-10 rounded-lg" />
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 text-xs uppercase border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th class="py-3 px-4 w-16">ID</th>
              <th class="py-3 px-4">Nama Sistem</th>
              <th class="py-3 px-4">Label Tampilan</th>
              <th class="py-3 px-4 w-36">Warna</th>
              <th class="py-3 px-4 w-32">Status Final</th>
              <th class="py-3 px-4 w-28 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="s in statuses"
              :key="s.id"
              class="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="py-3 px-4 text-xs font-mono text-gray-400">{{ s.id }}</td>
              <td class="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                {{ s.name }}
              </td>
              <td class="py-3 px-4">
                <span class="px-2.5 py-1 rounded-full text-xs font-medium text-white" :style="{ backgroundColor: s.color }">
                  {{ s.label }}
                </span>
              </td>
              <td class="py-3 px-4 font-mono text-xs text-gray-500 flex items-center gap-2">
                <span class="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 inline-block" :style="{ backgroundColor: s.color }" />
                {{ s.color }}
              </td>
              <td class="py-3 px-4">
                <UBadge
                  :label="s.isFinal ? 'Ya' : 'Tidak'"
                  :color="s.isFinal ? 'green' : 'gray'"
                  size="xs"
                  variant="subtle"
                />
              </td>
              <td class="py-3 px-4 text-right">
                <UButton
                  icon="i-lucide-pencil"
                  variant="ghost"
                  color="gray"
                  size="2xs"
                  label="Edit"
                  @click="openEdit(s)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit Status Modal -->
    <UModal v-model="isModalOpen">
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
          Edit Status {{ editingStatus?.name }}
        </h3>

        <form class="space-y-4" @submit.prevent="handleSave">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Label Bahasa Indonesia
            </label>
            <UInput v-model="form.label" required />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Warna Hex
            </label>
            <div class="flex items-center gap-3">
              <input v-model="form.color" type="color" class="w-10 h-10 rounded border cursor-pointer" />
              <UInput v-model="form.color" class="flex-1 font-mono" />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <UButton variant="ghost" color="gray" label="Batal" @click="isModalOpen = false" />
            <UButton
              type="submit"
              color="primary"
              label="Simpan"
              :loading="submitting"
              :disabled="!form.label.trim() || !form.color.trim() || submitting"
            />
          </div>
        </form>
      </div>
    </UModal>
  </div>
</template>
