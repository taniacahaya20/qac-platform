<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'auth',
})

const { t } = useI18n()
const authStore = useAuthStore()
const toast = useToast()
const router = useRouter()

const form = reactive({
  email: '',
  password: '',
})
const isLoading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  if (!form.email || !form.password) {
    errorMsg.value = 'Email dan password wajib diisi'
    return
  }

  isLoading.value = true
  errorMsg.value = ''

  try {
    const result = await authStore.login(form.email, form.password)
    if (result.success) {
      toast.add({ title: t('auth.loginSuccess'), color: 'green', icon: 'i-lucide-check-circle' })
      await router.push('/')
    } else {
      errorMsg.value = result.error ?? t('auth.loginError')
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-md">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="flex justify-center mb-4">
        <div class="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center">
          <UIcon name="i-lucide-test-tube-2" class="text-white text-3xl" />
        </div>
      </div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">QAC Tester</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">{{ t('app.tagline') }}</p>
    </div>

    <!-- Login Card -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          {{ t('auth.welcomeBack') }}
        </h2>
      </template>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <!-- Error Alert -->
        <UAlert
          v-if="errorMsg"
          icon="i-lucide-alert-circle"
          color="red"
          variant="soft"
          :description="errorMsg"
        />

        <!-- Email Field -->
        <UFormGroup :label="t('auth.email')" name="email">
          <UInput
            v-model="form.email"
            type="email"
            :placeholder="t('auth.emailPlaceholder')"
            icon="i-lucide-mail"
            size="lg"
            :disabled="isLoading"
            autocomplete="email"
          />
        </UFormGroup>

        <!-- Password Field -->
        <UFormGroup :label="t('auth.password')" name="password">
          <UInput
            v-model="form.password"
            type="password"
            :placeholder="t('auth.passwordPlaceholder')"
            icon="i-lucide-lock"
            size="lg"
            :disabled="isLoading"
            autocomplete="current-password"
          />
        </UFormGroup>

        <!-- Forgot Password -->
        <div class="flex justify-end">
          <UButton variant="link" size="xs" class="text-gray-500">
            {{ t('auth.forgotPassword') }}
          </UButton>
        </div>

        <!-- Submit -->
        <UButton
          type="submit"
          block
          size="lg"
          :loading="isLoading"
          :disabled="isLoading || !form.email.trim() || !form.password.trim()"
          color="primary"
        >
          {{ isLoading ? t('auth.loggingIn') : t('auth.loginButton') }}
        </UButton>
      </form>

      <template #footer>
        <p class="text-xs text-center text-gray-400">
          Demo: admin@qac.local / admin123
        </p>
      </template>
    </UCard>
  </div>
</template>
