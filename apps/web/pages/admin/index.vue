<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Administrasi' })

const authStore = useAuthStore()

onMounted(() => {
  if (!authStore.isAdmin) {
    navigateTo('/')
  }
})
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Administrasi Sistem</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Pengaturan konfigurasi pengguna, hak akses, status kustom, dan token integrasi.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <NuxtLink to="/admin/users" class="block">
        <UCard class="cursor-pointer hover:border-primary-500/50 hover:shadow-md transition-all h-full">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-blue-50 dark:bg-blue-950/50 rounded-xl flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-users" class="text-blue-600 dark:text-blue-400 text-2xl" />
            </div>
            <div>
              <h3 class="font-bold text-gray-900 dark:text-white text-base">Kelola User</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tambah pengguna, atur role (admin, lead, tester, viewer), dan status aktif.
              </p>
            </div>
          </div>
        </UCard>
      </NuxtLink>

      <NuxtLink to="/admin/statuses" class="block">
        <UCard class="cursor-pointer hover:border-primary-500/50 hover:shadow-md transition-all h-full">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-purple-50 dark:bg-purple-950/50 rounded-xl flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-palette" class="text-purple-600 dark:text-purple-400 text-2xl" />
            </div>
            <div>
              <h3 class="font-bold text-gray-900 dark:text-white text-base">Kustomisasi Status</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Atur label Bahasa Indonesia dan palet warna untuk Passed, Failed, Blocked, Retest, dll.
              </p>
            </div>
          </div>
        </UCard>
      </NuxtLink>

      <NuxtLink to="/admin/api-keys" class="block">
        <UCard class="cursor-pointer hover:border-primary-500/50 hover:shadow-md transition-all h-full">
          <div class="flex items-start gap-4">
            <div class="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-key" class="text-emerald-600 dark:text-emerald-400 text-2xl" />
            </div>
            <div>
              <h3 class="font-bold text-gray-900 dark:text-white text-base">API Keys</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Buat dan kelola kunci otentikasi API untuk reporter Playwright CI/CD.
              </p>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </div>
</template>
