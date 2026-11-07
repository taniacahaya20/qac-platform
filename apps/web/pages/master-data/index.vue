<script setup lang="ts">
import { apiFetch } from '~/composables/useApi'
import { useProjectStore } from '~/stores/projects'

definePageMeta({ middleware: 'auth' })
useHead({ title: 'Master Data — QAC Platform' })

const projectStore = useProjectStore()
const toast = useToast()

const activeTab = ref<'modules' | 'actors' | 'conditions'>('modules')

interface ModuleItem {
  id: string
  projectId: string
  name: string
  code: string
  description?: string | null
  caseCount: number
  createdAt: string
}

interface ActorItem {
  id: string
  projectId?: string | null
  name: string
  description?: string | null
  createdAt: string
}

const selectedProjectId = ref<string>('')
const modules = ref<ModuleItem[]>([])
const actors = ref<ActorItem[]>([])
const loading = ref(true)

// Modal Modul
const isModuleModalOpen = ref(false)
const isEditingModule = ref(false)
const editingModuleId = ref<string | null>(null)
const moduleForm = reactive({
  name: '',
  code: '',
  description: '',
})
const submittingModule = ref(false)

// Modal Aktor
const isActorModalOpen = ref(false)
const actorForm = reactive({
  name: '',
  description: '',
})
const submittingActor = ref(false)

// Master Conditions
const conditions = [
  {
    name: 'Positif Case',
    code: 'POS',
    color: 'green' as const,
    description: 'Skenario jalur utama (happy path) di mana pengguna memasukkan data valid dan sistem beroperasi sesuai alur normal yang diharapkan.',
    examples: ['Login berhasil dengan username dan password valid', 'Membuat pesanan baru dengan saldo mencukupi', 'Checkout invoice lunas'],
  },
  {
    name: 'Negatif Case',
    code: 'NEG',
    color: 'red' as const,
    description: 'Skenario pengujian kesalahan, input tidak valid, format salah, atau hak akses tidak diizinkan untuk memastikan sistem menolak dan menampilkan pesan error yang ramah.',
    examples: ['Login gagal dengan password salah', 'Input form dengan format email tanpa simbol @', 'Submit order tanpa memilih armada pengangkut'],
  },
  {
    name: 'Edge Case',
    code: 'EDG',
    color: 'amber' as const,
    description: 'Skenario kondisi batas (boundary values), data ekstrim, volume muatan maksimum, atau aksi serentak (concurrency) di luar kebiasaan operasional.',
    examples: ['Upload dokumen dengan ukuran pas 10MB (batas maksimal)', 'Input karakter string panjang 500 karakter pada nama perusahaan', 'Dua admin mengonfirmasi shipment yang sama di detik yang sama'],
  },
  {
    name: 'Network Case',
    code: 'NET',
    color: 'purple' as const,
    description: 'Skenario kestabilan aplikasi saat menghadapi kendala jaringan seperti koneksi terputus, latency tinggi (3G/slow network), API timeout, atau mode offline.',
    examples: ['Koneksi internet terputus saat proses transfer pembayaran', 'Respon server backend timeout lebih dari 30 detik', 'Driver submit status keberangkatan saat sinyal GPS lemah'],
  },
]

async function loadData() {
  loading.value = true
  if (projectStore.projects.length === 0) {
    await projectStore.fetchProjects()
  }

  if (!selectedProjectId.value && projectStore.projects.length > 0) {
    selectedProjectId.value = projectStore.projects[0].id
  }

  if (selectedProjectId.value) {
    const resMod = await apiFetch<ModuleItem[]>(`/api/v1/projects/${selectedProjectId.value}/modules`)
    if (resMod.data) {
      modules.value = resMod.data
    }
  }

  const resAct = await apiFetch<ActorItem[]>(`/api/v1/actors`)
  if (resAct.data) {
    actors.value = resAct.data
  }
  loading.value = false
}

onMounted(() => {
  loadData()
})

// Auto-generate Module Code from name
function handleModuleNameInput() {
  if (!moduleForm.code || moduleForm.code.length <= 4) {
    const cleaned = moduleForm.name.trim().replace(/[^a-zA-Z0-9\s]/g, '')
    const words = cleaned.split(/\s+/).filter(Boolean)
    if (words.length === 1) {
      moduleForm.code = words[0].slice(0, 4).toUpperCase()
    } else if (words.length >= 2) {
      if (words[1].length >= 4) {
        moduleForm.code = words[1].slice(0, 4).toUpperCase()
      } else {
        moduleForm.code = (words[0].slice(0, 2) + words[1].slice(0, 2)).toUpperCase()
      }
    }
  }
}

function openCreateModule() {
  isEditingModule.value = false
  editingModuleId.value = null
  moduleForm.name = ''
  moduleForm.code = ''
  moduleForm.description = ''
  isModuleModalOpen.value = true
}

function openEditModule(m: ModuleItem) {
  isEditingModule.value = true
  editingModuleId.value = m.id
  moduleForm.name = m.name
  moduleForm.code = m.code
  moduleForm.description = m.description || ''
  isModuleModalOpen.value = true
}

async function saveModule() {
  if (!moduleForm.name.trim()) return

  submittingModule.value = true
  let res
  if (isEditingModule.value && editingModuleId.value) {
    res = await apiFetch(`/api/v1/modules/${editingModuleId.value}`, {
      method: 'PATCH',
      body: {
        name: moduleForm.name.trim(),
        code: moduleForm.code.trim().toUpperCase(),
        description: moduleForm.description.trim() || undefined,
      },
    })
  } else {
    res = await apiFetch(`/api/v1/projects/${selectedProjectId.value}/modules`, {
      method: 'POST',
      body: {
        name: moduleForm.name.trim(),
        code: moduleForm.code.trim().toUpperCase() || undefined,
        description: moduleForm.description.trim() || undefined,
      },
    })
  }
  submittingModule.value = false

  if (res.data) {
    toast.add({
      title: isEditingModule.value ? 'Modul diperbarui' : 'Master modul berhasil dibuat',
      color: 'green',
    })
    isModuleModalOpen.value = false
    loadData()
  } else {
    toast.add({ title: res.error ?? 'Terjadi kesalahan', color: 'red' })
  }
}

async function handleDeleteModule(m: ModuleItem) {
  if (!confirm(`Hapus master modul "${m.name} (${m.code})"? Test case yang terkait tidak akan terhapus namun tidak memiliki tautan modul.`)) return

  const res = await apiFetch(`/api/v1/modules/${m.id}`, { method: 'DELETE' })
  if (res.data) {
    toast.add({ title: 'Modul berhasil dihapus', color: 'green' })
    loadData()
  }
}

async function saveActor() {
  if (!actorForm.name.trim()) return

  submittingActor.value = true
  const res = await apiFetch(`/api/v1/actors`, {
    method: 'POST',
    body: {
      name: actorForm.name.trim(),
      description: actorForm.description.trim() || undefined,
    },
  })
  submittingActor.value = false

  if (res.data) {
    toast.add({ title: 'Aktor baru berhasil ditambahkan', color: 'green' })
    isActorModalOpen.value = false
    actorForm.name = ''
    actorForm.description = ''
    loadData()
  } else {
    toast.add({ title: res.error ?? 'Gagal membuat aktor', color: 'red' })
  }
}

async function handleDeleteActor(a: ActorItem) {
  if (!confirm(`Hapus aktor "${a.name}"?`)) return
  const res = await apiFetch(`/api/v1/actors/${a.id}`, { method: 'DELETE' })
  if (res.data) {
    toast.add({ title: 'Aktor berhasil dihapus', color: 'green' })
    loadData()
  }
}
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <UIcon name="i-lucide-database" class="text-primary-600 text-lg" />
          <span class="text-xs font-bold uppercase text-gray-400 tracking-wider">
            Manajemen Data
          </span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Master Data Pengujian
        </h1>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Pusat pengelolaan master modul, singkatan kode modul, profil aktor, dan kondisi test case.
        </p>
      </div>

      <!-- Project Picker for Project-Specific Data -->
      <div v-if="activeTab === 'modules'" class="w-full sm:w-64">
        <label class="block text-[11px] font-bold uppercase text-gray-400 mb-1">Pilih Proyek:</label>
        <USelectMenu
          v-model="selectedProjectId"
          :options="projectStore.projects.map(p => ({ label: p.name, value: p.id }))"
          value-attribute="value"
          option-attribute="label"
          size="sm"
          @update:model-value="loadData"
        />
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
      <button
        type="button"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        :class="activeTab === 'modules'
          ? 'bg-primary-600 text-white shadow-xs'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
        @click="activeTab = 'modules'"
      >
        <UIcon name="i-lucide-layers" class="text-base" />
        <span>Master Modul ({{ modules.length }})</span>
      </button>

      <button
        type="button"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        :class="activeTab === 'actors'
          ? 'bg-primary-600 text-white shadow-xs'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
        @click="activeTab = 'actors'"
      >
        <UIcon name="i-lucide-users" class="text-base" />
        <span>Master Aktor ({{ actors.length }})</span>
      </button>

      <button
        type="button"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        :class="activeTab === 'conditions'
          ? 'bg-primary-600 text-white shadow-xs'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
        @click="activeTab = 'conditions'"
      >
        <UIcon name="i-lucide-sliders" class="text-base" />
        <span>Master Kondisi (4)</span>
      </button>
    </div>

    <!-- TAB 1: MASTER MODUL -->
    <div v-if="activeTab === 'modules'" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-gray-900 dark:text-white">
            Daftar Modul Sistem
          </h2>
          <p class="text-xs text-gray-500">
            Kode singkatan modul digunakan untuk mengenerate TestCase ID (contoh: AUTH-001, ORD-002).
          </p>
        </div>
        <UButton
          icon="i-lucide-plus"
          label="Tambah Modul"
          color="primary"
          size="sm"
          @click="openCreateModule"
        />
      </div>

      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs">
        <div v-if="loading" class="p-6 space-y-3">
          <USkeleton class="h-10 rounded-lg" />
          <USkeleton class="h-10 rounded-lg" />
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50/70 dark:bg-gray-800/60 text-gray-500 uppercase text-xs border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th class="py-3 px-4 w-28">Kode Modul</th>
                <th class="py-3 px-4">Nama Modul</th>
                <th class="py-3 px-4">Deskripsi / Cakupan</th>
                <th class="py-3 px-4 w-36 text-center">Jumlah Test Case</th>
                <th class="py-3 px-4 w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr
                v-for="m in modules"
                :key="m.id"
                class="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
              >
                <td class="py-3 px-4 font-mono font-bold text-primary-600 dark:text-primary-400">
                  <span class="px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/70 ring-1 ring-primary-500/20">
                    {{ m.code }}
                  </span>
                </td>
                <td class="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                  {{ m.name }}
                </td>
                <td class="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                  {{ m.description || '—' }}
                </td>
                <td class="py-3 px-4 text-center">
                  <UBadge
                    :label="`${m.caseCount} Kasus`"
                    color="gray"
                    variant="subtle"
                    size="xs"
                  />
                </td>
                <td class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <UButton
                      icon="i-lucide-pencil"
                      variant="ghost"
                      color="gray"
                      size="2xs"
                      title="Edit Modul"
                      @click="openEditModule(m)"
                    />
                    <UButton
                      icon="i-lucide-trash-2"
                      variant="ghost"
                      color="red"
                      size="2xs"
                      title="Hapus Modul"
                      @click="handleDeleteModule(m)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: MASTER AKTOR -->
    <div v-if="activeTab === 'actors'" class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-gray-900 dark:text-white">
            Daftar Aktor / Peran Pengguna
          </h2>
          <p class="text-xs text-gray-500">
            Aktor digunakan pada form test case untuk mendefinisikan pengguna yang menjalankan skenario uji.
          </p>
        </div>
        <UButton
          icon="i-lucide-plus"
          label="Tambah Aktor"
          color="primary"
          size="sm"
          @click="isActorModalOpen = true"
        />
      </div>

      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-gray-50/70 dark:bg-gray-800/60 text-gray-500 uppercase text-xs border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th class="py-3 px-4 w-44">Nama Aktor</th>
                <th class="py-3 px-4">Deskripsi / Peran Pengguna</th>
                <th class="py-3 px-4 w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr
                v-for="a in actors"
                :key="a.id"
                class="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
              >
                <td class="py-3 px-4 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <UIcon name="i-lucide-user" class="text-primary-600 text-sm" />
                  {{ a.name }}
                </td>
                <td class="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                  {{ a.description || '—' }}
                </td>
                <td class="py-3 px-4 text-right">
                  <UButton
                    icon="i-lucide-trash-2"
                    variant="ghost"
                    color="red"
                    size="2xs"
                    title="Hapus Aktor"
                    @click="handleDeleteActor(a)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: MASTER KONDISI (CONDITIONS) -->
    <div v-if="activeTab === 'conditions'" class="space-y-4">
      <div>
        <h2 class="text-base font-bold text-gray-900 dark:text-white">
          Klasifikasi Kondisi Pengujian (Test Conditions)
        </h2>
        <p class="text-xs text-gray-500">
          Standar acuan pembagian kategori kondisi pengujian yang digunakan dalam platform QAC.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="cond in conditions"
          :key="cond.name"
          class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-xs space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UBadge
                :label="cond.name"
                :color="cond.color"
                size="sm"
                variant="subtle"
              />
              <span class="font-mono text-xs text-gray-400 font-bold">[{{ cond.code }}]</span>
            </div>
          </div>

          <p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            {{ cond.description }}
          </p>

          <div class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800 space-y-1.5">
            <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Contoh Skenario:
            </span>
            <ul class="list-disc list-inside text-[11px] text-gray-600 dark:text-gray-400 space-y-0.5">
              <li v-for="(ex, i) in cond.examples" :key="i">{{ ex }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL CREATE/EDIT MODUL -->
    <UModal v-model="isModuleModalOpen">
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
          {{ isEditingModule ? 'Edit Master Modul' : 'Tambah Master Modul Baru' }}
        </h3>

        <form class="space-y-4" @submit.prevent="saveModule">
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Nama Modul <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="moduleForm.name"
              placeholder="Contoh: Vendor Management, Payment Gateway"
              required
              @input="handleModuleNameInput"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Kode Singkatan Modul <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="moduleForm.code"
              placeholder="Contoh: VND, PAY"
              class="font-mono font-bold uppercase"
              required
            />
            <span class="text-[10px] text-gray-400">
              Otomatis di-generate dari nama modul (digunakan untuk awalan TestCase ID, misal: VND-001)
            </span>
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Deskripsi Modul
            </label>
            <UTextarea
              v-model="moduleForm.description"
              rows="2"
              placeholder="Jelaskan cakupan fitur modul ini..."
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <UButton variant="ghost" color="gray" label="Batal" @click="isModuleModalOpen = false" />
            <UButton
              type="submit"
              color="primary"
              :label="isEditingModule ? 'Simpan' : 'Buat Modul'"
              :loading="submittingModule"
              :disabled="!selectedProjectId || !moduleForm.name.trim() || !moduleForm.code.trim() || submittingModule"
            />
          </div>
        </form>
      </div>
    </UModal>

    <!-- MODAL CREATE AKTOR -->
    <UModal v-model="isActorModalOpen">
      <div class="p-6 space-y-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3">
          Tambah Aktor Baru
        </h3>

        <form class="space-y-4" @submit.prevent="saveActor">
          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Nama Aktor / Role <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="actorForm.name"
              placeholder="Contoh: Dispatcher, Warehouse Officer"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
              Deskripsi Peran
            </label>
            <UTextarea
              v-model="actorForm.description"
              rows="2"
              placeholder="Peran dan wewenang aktor ini di aplikasi..."
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <UButton variant="ghost" color="gray" label="Batal" @click="isActorModalOpen = false" />
            <UButton
              type="submit"
              color="primary"
              label="Simpan Aktor"
              :loading="submittingActor"
              :disabled="!actorForm.name.trim() || submittingActor"
            />
          </div>
        </form>
      </div>
    </UModal>
  </div>
</template>
