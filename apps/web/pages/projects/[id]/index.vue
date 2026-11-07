<script setup lang="ts">
import { useProjectStore } from '~/stores/projects'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const projectStore = useProjectStore()
const projectId = computed(() => route.params.id as string)

const { data: projectData, pending } = await useAsyncData(
  `project-${projectId.value}`,
  () => projectStore.fetchProject(projectId.value)
)

useHead(() => ({ title: projectStore.currentProject?.name ?? 'Proyek' }))
</script>

<template>
  <div class="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
    <!-- Loading -->
    <div v-if="pending" class="p-6">
      <USkeleton class="h-20 rounded-xl mb-4" />
      <USkeleton class="h-10 rounded-xl" />
    </div>

    <template v-else-if="projectStore.currentProject">
      <!-- Project Tabs Header -->
      <ProjectTabs :project-id="projectId" active-tab="overview" />

      <div class="max-w-7xl mx-auto p-6">
        <!-- Announcement -->
        <div
          v-if="projectStore.currentProject.announcement"
          class="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6"
        >
          <div class="flex items-start gap-3">
            <UIcon name="i-lucide-megaphone" class="text-blue-600 mt-0.5" />
            <div>
              <h4 class="font-medium text-blue-900 dark:text-blue-100 mb-1">Pengumuman</h4>
              <p class="text-sm text-blue-800 dark:text-blue-200">
                {{ projectStore.currentProject.announcement }}
              </p>
            </div>
          </div>
        </div>

        <!-- Project Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UCard>
            <template #header>
              <h3 class="font-semibold">Informasi Proyek</h3>
            </template>
            <div class="space-y-3 text-sm">
              <div class="flex gap-2">
                <span class="text-gray-500 w-32 shrink-0">Nama</span>
                <span class="font-medium">{{ projectStore.currentProject.name }}</span>
              </div>
              <div class="flex gap-2">
                <span class="text-gray-500 w-32 shrink-0">Status</span>
                <UBadge
                  :label="projectStore.currentProject.isCompleted ? 'Selesai' : 'Aktif'"
                  :color="projectStore.currentProject.isCompleted ? 'green' : 'blue'"
                  variant="soft"
                  size="xs"
                />
              </div>
              <div v-if="projectStore.currentProject.description" class="flex gap-2">
                <span class="text-gray-500 w-32 shrink-0">Deskripsi</span>
                <span>{{ projectStore.currentProject.description }}</span>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="font-semibold">Aksi Cepat</h3>
            </template>
            <div class="space-y-2">
              <UButton
                :to="`/projects/${projectId}/cases`"
                icon="i-lucide-file-check-2"
                label="Repositori Test Cases"
                variant="solid"
                color="primary"
                block
              />
              <UButton
                :to="`/projects/${projectId}/runs/new`"
                icon="i-lucide-play"
                label="Buat Test Run"
                variant="soft"
                color="green"
                block
              />
            </div>
          </UCard>
        </div>
      </div>
    </template>

    <div v-else class="p-6 text-center text-gray-400">
      <UIcon name="i-lucide-folder-x" class="text-5xl mb-3" />
      <p>Proyek tidak ditemukan</p>
      <UButton class="mt-4" to="/projects" label="Kembali ke Proyek" icon="i-lucide-arrow-left" />
    </div>
  </div>
</template>
