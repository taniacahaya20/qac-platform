<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Profil Saya' })

const authStore = useAuthStore()
const toast = useToast()
const { t } = useI18n()

const form = reactive({
  name: authStore.user?.name ?? '',
})

const userInitials = computed(() => {
  if (!authStore.user) return '?'
  return authStore.user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
})

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  lead: 'QA Lead',
  tester: 'Tester',
  viewer: 'Viewer',
}

async function handleUpdate() {
  const result = await apiFetch('/auth/profile', { method: 'PATCH', body: { name: form.name } })
  if (result.error) {
    toast.add({ title: 'Gagal memperbarui profil', description: result.error, color: 'red' })
  } else {
    if (authStore.user) authStore.user.name = form.name
    toast.add({ title: 'Profil berhasil diperbarui', color: 'green' })
  }
}
</script>

<template>
  <div class="p-6 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">{{ t('nav.profile') }}</h1>

    <UCard>
      <div class="flex items-center gap-4 mb-6">
        <UAvatar :text="userInitials" size="xl" />
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ authStore.user?.name }}
          </h2>
          <p class="text-sm text-gray-500">{{ authStore.user?.email }}</p>
          <UBadge
            :label="roleLabels[authStore.user?.role ?? 'tester']"
            color="blue"
            variant="soft"
            size="xs"
            class="mt-1"
          />
        </div>
      </div>

      <form class="space-y-4" @submit.prevent="handleUpdate">
        <UFormGroup label="Nama Lengkap">
          <UInput v-model="form.name" placeholder="Nama lengkap Anda" />
        </UFormGroup>

        <UFormGroup label="Email">
          <UInput :value="authStore.user?.email" disabled />
        </UFormGroup>

        <div class="flex justify-end">
          <UButton
            type="submit"
            color="primary"
            :label="t('common.save')"
            :disabled="!form.name.trim()"
          />
        </div>
      </form>
    </UCard>
  </div>
</template>
