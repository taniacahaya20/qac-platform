<script setup lang="ts">
import { apiFetch } from '~/composables/useApi'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'API Keys — Admin' })

const authStore = useAuthStore()
const toast = useToast()

interface ApiKeyItem {
  id: string
  name: string
  userId: string
  userName: string
  lastUsedAt: string | null
  createdAt: string
}

const keys = ref<ApiKeyItem[]>([])
const loading = ref(true)
const isModalOpen = ref(false)
const keyName = ref('')
const submitting = ref(false)
const generatedKey = ref<string | null>(null)

async function fetchKeys() {
  loading.value = true
  const res = await apiFetch<ApiKeyItem[]>('/api/v1/api-keys')
  if (res.data) {
    keys.value = res.data
  }
  loading.value = false
}

onMounted(() => {
  if (!authStore.isAdmin) {
    navigateTo('/')
    return
  }
  fetchKeys()
})

function openCreateModal() {
  keyName.value = ''
  generatedKey.value = null
  isModalOpen.value = true
}

async function handleCreateKey() {
  if (!keyName.value.trim()) return

  submitting.value = true
  const res = await apiFetch<{ key: string }>('/api/v1/api-keys', {
    method: 'POST',
    body: { name: keyName.value.trim() },
  })
  submitting.value = false

  if (res.data) {
    generatedKey.value = res.data.key
    toast.add({ title: 'API Key berhasil dibuat!', color: 'green' })
    fetchKeys()
  } else {
    toast.add({ title: res.error ?? 'Gagal membuat API key', color: 'red' })
  }
}

async function copyToClipboard(text: string) {
  if (navigator?.clipboard) {
    await navigator.clipboard.writeText(text)
    toast.add({ title: 'Kunci disalin ke clipboard', color: 'green' })
  }
}

async function handleRevokeKey(k: ApiKeyItem) {
  if (!confirm(`Cabut akses untuk API key "${k.name}"? Reporter CI yang memakai key ini akan gagal otentikasi.`)) return

  const res = await apiFetch(`/api/v1/api-keys/${k.id}`, { method: 'DELETE' })
  if (res.data) {
    toast.add({ title: 'API Key berhasil dicabut', color: 'green' })
    fetchKeys()
  }
}

function formatDate(iso: string | null) {
  if (!iso) return 'Belum pernah'
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
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <NuxtLink to="/admin" class="text-xs text-gray-500 hover:text-primary-600">
            Administrasi
          </NuxtLink>
          <span class="text-xs text-gray-400">/</span>
          <span class="text-xs text-gray-900 dark:text-white font-semibold">API Keys</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          API Keys untuk Integrasi Automation
        </h1>
        <p class="text-xs text-gray-500 mt-1">
          Kunci otentikasi untuk mengirim hasil test runner (Playwright, Cypress, dll) ke QAC Tester.
        </p>
      </div>

      <UButton
        icon="i-lucide-key-round"
        label="Generate API Key"
        color="primary"
        @click="openCreateModal"
      />
    </div>

    <!-- Table -->
    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs">
      <div v-if="loading" class="p-6 space-y-3">
        <USkeleton class="h-10 rounded-lg" />
        <USkeleton class="h-10 rounded-lg" />
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-50/50 dark:bg-gray-800/50 text-gray-500 text-xs uppercase border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th class="py-3 px-4">Nama Token / Klien</th>
              <th class="py-3 px-4 w-44">Dibuat Oleh</th>
              <th class="py-3 px-4 w-44">Terakhir Digunakan</th>
              <th class="py-3 px-4 w-44">Tanggal Dibuat</th>
              <th class="py-3 px-4 w-28 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="k in keys"
              :key="k.id"
              class="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="py-3 px-4 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UIcon name="i-lucide-key" class="text-primary-600 text-sm" />
                {{ k.name }}
              </td>
              <td class="py-3 px-4 text-xs text-gray-500">
                {{ k.userName }}
              </td>
              <td class="py-3 px-4 text-xs font-mono text-gray-400">
                {{ formatDate(k.lastUsedAt) }}
              </td>
              <td class="py-3 px-4 text-xs text-gray-400">
                {{ formatDate(k.createdAt) }}
              </td>
              <td class="py-3 px-4 text-right">
                <UButton
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  color="red"
                  size="2xs"
                  title="Cabut Kunci"
                  @click="handleRevokeKey(k)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create API Key Modal -->
    <UModal v-model="isModalOpen">
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
          Buat API Key Baru
        </h3>

        <!-- Form when key not yet generated -->
        <div v-if="!generatedKey" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Nama Identifikasi Token <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="keyName"
              placeholder="Contoh: GitHub Actions CI/CD, GitLab Runner, Local Playwright"
              required
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
            <UButton variant="ghost" color="gray" label="Batal" @click="isModalOpen = false" />
            <UButton
              color="primary"
              label="Generate Key"
              :loading="submitting"
              :disabled="!keyName.trim() || submitting"
              @click="handleCreateKey"
            />
          </div>
        </div>

        <!-- Display Key with Copy Button -->
        <div v-else class="space-y-4">
          <UAlert
            icon="i-lucide-alert-triangle"
            color="amber"
            variant="soft"
            title="Salin Kunci Anda Sekarang!"
            description="Untuk alasan keamanan, kunci API ini hanya akan ditampilkan satu kali ini saja. Simpan kunci ini di secrets CI/CD Anda."
          />

          <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg flex items-center justify-between font-mono text-xs break-all gap-2">
            <span class="text-primary-700 dark:text-primary-300 font-bold select-all">
              {{ generatedKey }}
            </span>
            <UButton
              icon="i-lucide-copy"
              size="xs"
              color="primary"
              variant="solid"
              @click="copyToClipboard(generatedKey)"
            >
              Salin
            </UButton>
          </div>

          <div class="pt-4 border-t border-gray-100 dark:border-gray-800 text-right">
            <UButton
              color="primary"
              label="Selesai"
              @click="isModalOpen = false"
            />
          </div>
        </div>
      </div>
    </UModal>
  </div>
</template>
