<script setup lang="ts">
import { apiFetch } from '~/composables/useApi'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Kelola Pengguna — Admin' })

const authStore = useAuthStore()
const toast = useToast()

interface UserItem {
  id: string
  name: string
  email: string
  role: 'admin' | 'lead' | 'tester' | 'viewer'
  isActive: boolean
  createdAt: string
}

const users = ref<UserItem[]>([])
const loading = ref(true)
const isModalOpen = ref(false)
const submitting = ref(false)

const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'tester' as 'admin' | 'lead' | 'tester' | 'viewer',
})

const roleOptions = [
  { value: 'admin', label: 'Admin (Full Akses)' },
  { value: 'lead', label: 'Lead QA' },
  { value: 'tester', label: 'Tester' },
  { value: 'viewer', label: 'Viewer (Read Only)' },
]

async function fetchUsers() {
  loading.value = true
  const res = await apiFetch<UserItem[]>('/api/v1/users?limit=50')
  if (res.data) {
    users.value = res.data
  }
  loading.value = false
}

onMounted(() => {
  if (!authStore.isAdmin) {
    navigateTo('/')
    return
  }
  fetchUsers()
})

function openCreateModal() {
  form.name = ''
  form.email = ''
  form.password = ''
  form.role = 'tester'
  isModalOpen.value = true
}

async function handleCreateUser() {
  if (!form.name.trim() || !form.email.trim() || !form.password) {
    toast.add({ title: 'Semua field wajib diisi', color: 'red' })
    return
  }

  submitting.value = true
  const res = await apiFetch('/api/v1/users', {
    method: 'POST',
    body: form,
  })
  submitting.value = false

  if (res.data) {
    toast.add({ title: 'Pengguna baru berhasil ditambahkan', color: 'green' })
    isModalOpen.value = false
    fetchUsers()
  } else {
    toast.add({ title: res.error ?? 'Gagal membuat pengguna', color: 'red' })
  }
}

async function toggleActive(u: UserItem) {
  const res = await apiFetch(`/api/v1/users/${u.id}`, {
    method: 'PATCH',
    body: { isActive: !u.isActive },
  })
  if (res.data) {
    toast.add({
      title: u.isActive ? 'Pengguna dinonaktifkan' : 'Pengguna diaktifkan',
      color: 'green',
    })
    fetchUsers()
  }
}

async function updateRole(u: UserItem, newRole: string) {
  const res = await apiFetch(`/api/v1/users/${u.id}`, {
    method: 'PATCH',
    body: { role: newRole },
  })
  if (res.data) {
    toast.add({ title: 'Peran pengguna diperbarui', color: 'green' })
    fetchUsers()
  }
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'admin': return { label: 'Admin', color: 'red' as const }
    case 'lead': return { label: 'Lead QA', color: 'purple' as const }
    case 'tester': return { label: 'Tester', color: 'blue' as const }
    default: return { label: 'Viewer', color: 'gray' as const }
  }
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <NuxtLink to="/admin" class="text-xs text-gray-500 hover:text-primary-600">
            Administrasi
          </NuxtLink>
          <span class="text-xs text-gray-400">/</span>
          <span class="text-xs text-gray-900 dark:text-white font-semibold">User</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Manajemen Pengguna
        </h1>
      </div>

      <UButton
        icon="i-lucide-user-plus"
        label="Tambah User"
        color="primary"
        @click="openCreateModal"
      />
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs">
      <div v-if="loading" class="p-6 space-y-3">
        <USkeleton class="h-10 rounded-lg" />
        <USkeleton class="h-10 rounded-lg" />
        <USkeleton class="h-10 rounded-lg" />
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 text-xs uppercase border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th class="py-3 px-4">Nama</th>
              <th class="py-3 px-4">Email</th>
              <th class="py-3 px-4 w-36">Peran</th>
              <th class="py-3 px-4 w-32">Status</th>
              <th class="py-3 px-4 w-36 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="u in users"
              :key="u.id"
              class="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                {{ u.name }}
              </td>
              <td class="py-3 px-4 text-xs font-mono text-gray-500">
                {{ u.email }}
              </td>
              <td class="py-3 px-4">
                <UBadge
                  :label="getRoleBadge(u.role).label"
                  :color="getRoleBadge(u.role).color"
                  size="xs"
                  variant="subtle"
                />
              </td>
              <td class="py-3 px-4">
                <UBadge
                  :label="u.isActive ? 'Aktif' : 'Nonaktif'"
                  :color="u.isActive ? 'green' : 'gray'"
                  size="xs"
                  variant="soft"
                />
              </td>
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <UButton
                    :icon="u.isActive ? 'i-lucide-user-x' : 'i-lucide-user-check'"
                    :color="u.isActive ? 'red' : 'green'"
                    variant="ghost"
                    size="2xs"
                    :title="u.isActive ? 'Nonaktifkan' : 'Aktifkan'"
                    @click="toggleActive(u)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Create User -->
    <UModal v-model="isModalOpen">
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
          Tambah Pengguna Baru
        </h3>

        <form class="space-y-4" @submit.prevent="handleCreateUser">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Nama Lengkap <span class="text-red-500">*</span>
            </label>
            <UInput v-model="form.name" placeholder="Contoh: Andi Pratama" required />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Email <span class="text-red-500">*</span>
            </label>
            <UInput v-model="form.email" type="email" placeholder="andi@qac.local" required />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Password <span class="text-red-500">*</span>
            </label>
            <UInput v-model="form.password" type="password" placeholder="Minimal 6 karakter" required />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Peran (Role)
            </label>
            <USelectMenu
              v-model="form.role"
              :options="roleOptions"
              value-attribute="value"
              option-attribute="label"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <UButton variant="ghost" color="gray" label="Batal" @click="isModalOpen = false" />
            <UButton
              type="submit"
              color="primary"
              label="Simpan"
              :loading="submitting"
              :disabled="!form.name.trim() || !form.email.trim() || !form.password.trim() || submitting"
            />
          </div>
        </form>
      </div>
    </UModal>
  </div>
</template>
