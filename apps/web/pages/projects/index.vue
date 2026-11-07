<script setup lang="ts">
import { useProjectStore } from '~/stores/projects'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Proyek' })

const { t } = useI18n()
const projectStore = useProjectStore()
const toast = useToast()

const isCreateOpen = ref(false)
const createForm = reactive({ name: '', description: '' })
const isCreating = ref(false)

onMounted(() => projectStore.fetchProjects())

async function handleCreate() {
  if (!createForm.name) return
  isCreating.value = true
  const result = await projectStore.createProject({
    name: createForm.name,
    description: createForm.description || undefined,
  })
  isCreating.value = false
  if (result.error) {
    toast.add({ title: 'Gagal membuat proyek', description: result.error, color: 'red' })
  } else {
    toast.add({ title: 'Proyek berhasil dibuat', color: 'green' })
    isCreateOpen.value = false
    createForm.name = ''
    createForm.description = ''
  }
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ t('project.title') }}
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          {{ projectStore.projects.length }} proyek
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        :label="t('project.new')"
        color="primary"
        @click="isCreateOpen = true"
      />
    </div>

    <!-- Loading -->
    <div v-if="projectStore.isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <USkeleton v-for="i in 3" :key="i" class="h-40 rounded-xl" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="projectStore.projects.length === 0"
      class="text-center py-24 text-gray-400"
    >
      <UIcon name="i-lucide-folder-open" class="text-6xl mb-4" />
      <h3 class="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
        {{ t('project.noProjects') }}
      </h3>
      <p class="text-sm mb-6">{{ t('project.createFirst') }}</p>
      <UButton icon="i-lucide-plus" :label="t('project.new')" @click="isCreateOpen = true" />
    </div>

    <!-- Projects Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        v-for="project in projectStore.projects"
        :key="project.id"
        :to="`/projects/${project.id}`"
        class="block"
      >
        <UCard
          class="h-full hover:border-primary-300 dark:hover:border-primary-700 transition-colors cursor-pointer"
        >
          <div class="flex items-start justify-between mb-3">
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
              :style="{ backgroundColor: '#6366f1' }"
            >
              {{ project.name[0].toUpperCase() }}
            </div>
            <UBadge
              v-if="project.isCompleted"
              label="Selesai"
              color="green"
              variant="soft"
              size="xs"
            />
            <UBadge v-else label="Aktif" color="blue" variant="soft" size="xs" />
          </div>

          <h3 class="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
            {{ project.name }}
          </h3>
          <p v-if="project.description" class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
            {{ project.description }}
          </p>

          <div class="flex items-center gap-1 text-xs text-gray-400">
            <UIcon name="i-lucide-calendar" class="text-xs" />
            {{ new Date(project.createdAt).toLocaleDateString('id-ID') }}
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <!-- Create Project Modal -->
    <UModal v-model="isCreateOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">{{ t('project.new') }}</h3>
        </template>

        <form class="space-y-4" @submit.prevent="handleCreate">
          <UFormGroup :label="t('project.name')" required>
            <UInput
              v-model="createForm.name"
              :placeholder="t('project.name')"
              autofocus
            />
          </UFormGroup>
          <UFormGroup :label="t('project.description')">
            <UTextarea
              v-model="createForm.description"
              :placeholder="t('project.description')"
              :rows="3"
            />
          </UFormGroup>
        </form>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              variant="ghost"
              :label="t('common.cancel')"
              @click="isCreateOpen = false"
            />
            <UButton
              color="primary"
              :label="t('common.create')"
              :loading="isCreating"
              :disabled="!createForm.name?.trim() || isCreating"
              @click="handleCreate"
            />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
