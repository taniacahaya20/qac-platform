<script setup lang="ts">
import { apiFetch } from '~/composables/useApi'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const toast = useToast()

const projectId = computed(() => route.params.id as string)

const form = reactive({
  name: '',
  description: '',
  milestoneId: null as string | null,
  assignedTo: null as string | null,
  includeAll: true,
  caseIds: [] as string[],
})

const submitting = ref(false)
const milestones = ref<{ id: string; name: string }[]>([])
const users = ref<{ id: string; name: string }[]>([])
const availableCases = ref<{ id: string; code: string; title: string; sectionName: string }[]>([])
const loadingCases = ref(false)

onMounted(async () => {
  // Fetch milestones
  const msRes = await apiFetch<any[]>(`/api/v1/projects/${projectId.value}/milestones`)
  if (msRes.data) {
    milestones.value = msRes.data.map((m) => ({ id: m.id, name: m.name }))
  }

  // Fetch users
  const userRes = await apiFetch<any[]>(`/api/v1/users`)
  if (userRes.data) {
    users.value = userRes.data.map((u) => ({ id: u.id, name: u.name }))
  }

  // Fetch available cases for manual selection
  loadingCases.value = true
  const casesRes = await apiFetch<any[]>(`/api/v1/projects/${projectId.value}/cases`)
  if (casesRes.data) {
    availableCases.value = casesRes.data.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      sectionName: c.sectionName ?? 'Tanpa Section',
    }))
  }
  loadingCases.value = false
})

function toggleSelectAllCases() {
  if (form.caseIds.length === availableCases.value.length) {
    form.caseIds = []
  } else {
    form.caseIds = availableCases.value.map((c) => c.id)
  }
}

async function handleSubmit() {
  if (!form.name.trim()) {
    toast.add({ title: 'Nama Test Run wajib diisi', color: 'red' })
    return
  }

  if (!form.includeAll && form.caseIds.length === 0) {
    toast.add({ title: 'Pilih minimal satu test case', color: 'red' })
    return
  }

  submitting.value = true
  const res = await apiFetch<{ id: string }>(`/api/v1/projects/${projectId.value}/runs`, {
    method: 'POST',
    body: {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      milestoneId: form.milestoneId || undefined,
      assignedTo: form.assignedTo || undefined,
      includeAll: form.includeAll,
      caseIds: form.includeAll ? undefined : form.caseIds,
    },
  })

  submitting.value = false

  if (res.data) {
    toast.add({ title: 'Test Run berhasil dibuat', color: 'green' })
    router.push(`/projects/${projectId.value}/runs/${res.data.id}`)
  } else {
    toast.add({ title: res.error ?? 'Gagal membuat Test Run', color: 'red' })
  }
}
</script>

<template>
  <div class="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
    <!-- Project Tabs Header -->
    <ProjectTabs :project-id="projectId" active-tab="runs">
      <template #actions>
        <UButton
          :to="`/projects/${projectId}/runs`"
          icon="i-lucide-arrow-left"
          label="Kembali ke Daftar Run"
          variant="ghost"
          size="sm"
        />
      </template>
    </ProjectTabs>

    <!-- Main Content Form -->
    <div class="flex-1 max-w-4xl w-full mx-auto p-6">
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-xs">
        <div class="border-b border-gray-100 dark:border-gray-800 pb-4 mb-6">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">
            Buat Test Run Baru
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Tentukan test case yang akan dieksekusi, assign ke tester, dan kaitkan dengan milestone.
          </p>
        </div>

        <form class="space-y-6" @submit.prevent="handleSubmit">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              Nama Test Run <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="form.name"
              placeholder="Contoh: Sprint 3 Regression Test, Smoke Test Release v1.2"
              required
            />
          </div>

          <!-- Milestone & Assignee Row -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Milestone (Opsional)
              </label>
              <USelectMenu
                v-model="form.milestoneId"
                :options="[{ id: null, name: 'Tanpa Milestone' }, ...milestones]"
                value-attribute="id"
                option-attribute="name"
                placeholder="Pilih Milestone..."
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Assign Ke (Opsional)
              </label>
              <USelectMenu
                v-model="form.assignedTo"
                :options="[{ id: null, name: 'Belum Ditugaskan' }, ...users]"
                value-attribute="id"
                option-attribute="name"
                placeholder="Pilih Tester..."
              />
            </div>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              Deskripsi / Catatan Eksekusi
            </label>
            <UTextarea
              v-model="form.description"
              rows="3"
              placeholder="Jelaskan cakupan testing, target lingkungan, atau instruksi khusus..."
            />
          </div>

          <!-- Selection mode -->
          <div class="border-t border-gray-100 dark:border-gray-800 pt-6">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Pemilihan Test Case
            </h3>

            <div class="space-y-3">
              <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors"
                :class="form.includeAll ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-950/20' : 'border-gray-200 dark:border-gray-800'"
              >
                <input
                  v-model="form.includeAll"
                  type="radio"
                  :value="true"
                  class="text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div class="font-medium text-sm">Sertakan Semua Kasus Uji</div>
                  <div class="text-xs text-gray-500">
                    Otomatis memasukkan seluruh {{ availableCases.length }} test case aktif dalam repositori proyek.
                  </div>
                </div>
              </label>

              <label class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors"
                :class="!form.includeAll ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-950/20' : 'border-gray-200 dark:border-gray-800'"
              >
                <input
                  v-model="form.includeAll"
                  type="radio"
                  :value="false"
                  class="text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div class="font-medium text-sm">Pilih Kasus Uji Tertentu</div>
                  <div class="text-xs text-gray-500">
                    Pilih sebagian test case secara spesifik (misal hanya modul Login atau Order).
                  </div>
                </div>
              </label>
            </div>

            <!-- Manual Case Selection Box -->
            <div v-if="!form.includeAll" class="mt-4 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3">
              <div class="flex items-center justify-between text-xs pb-2 border-b border-gray-100 dark:border-gray-800">
                <span class="font-medium text-gray-600 dark:text-gray-300">
                  {{ form.caseIds.length }} dari {{ availableCases.length }} kasus uji terpilih
                </span>
                <UButton
                  variant="ghost"
                  size="2xs"
                  :label="form.caseIds.length === availableCases.length ? 'Batal Pilih Semua' : 'Pilih Semua'"
                  @click="toggleSelectAllCases"
                />
              </div>

              <div class="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-gray-100 dark:divide-gray-800/50">
                <label
                  v-for="c in availableCases"
                  :key="c.id"
                  class="flex items-center gap-2.5 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-800/50 px-2 rounded cursor-pointer"
                >
                  <input
                    v-model="form.caseIds"
                    type="checkbox"
                    :value="c.id"
                    class="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span class="font-mono text-primary-600 shrink-0 font-medium">{{ c.code }}</span>
                  <span class="truncate flex-1">{{ c.title }}</span>
                  <span class="text-gray-400 text-[11px] shrink-0">{{ c.sectionName }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Notice: Taskcase Locked after Run Case -->
          <div class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
            <UIcon name="i-lucide-lock" class="text-base text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span class="font-bold block">Proteksi Integritas Data Kasus Uji:</span>
              Ketika tombol <b>Jalankan Run Case</b> diklik, semua kasus uji yang masuk ke dalam run ini akan otomatis terkunci (*disabled*) dari pengeditan di halaman utama untuk menjaga akurasi hasil pengujian historis.
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <UButton
              :to="`/projects/${projectId}/runs`"
              variant="ghost"
              color="gray"
              label="Batal"
            />
            <UButton
              type="submit"
              color="green"
              label="Jalankan Run Case (Run)"
              icon="i-lucide-play"
              :loading="submitting"
              :disabled="!form.name.trim() || (!form.includeAll && form.caseIds.length === 0) || submitting"
            />
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
