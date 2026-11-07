<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useProjectStore } from '~/stores/projects'

const authStore = useAuthStore()
const projectStore = useProjectStore()
const route = useRoute()
const { t } = useI18n()
const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (val: boolean) => {
    colorMode.preference = val ? 'dark' : 'light'
  },
})

// Collapsible sidebar state (desktop)
const isCollapsed = ref(false)

// Mobile sidebar drawer state (< lg)
const isMobileOpen = ref(false)

onMounted(() => {
  if (import.meta.client) {
    const saved = localStorage.getItem('qac_sidebar_collapsed')
    if (saved !== null) {
      isCollapsed.value = saved === 'true'
    }
  }
  if (authStore.isLoggedIn) {
    projectStore.fetchProjects()
  }
})

function toggleSidebar() {
  isCollapsed.value = !isCollapsed.value
  if (import.meta.client) {
    localStorage.setItem('qac_sidebar_collapsed', String(isCollapsed.value))
  }
}

const userInitials = computed(() => {
  if (!authStore.user) return '?'
  return authStore.user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
})

const navItems = computed(() => [
  { label: t('nav.dashboard'), to: '/', icon: 'i-lucide-layout-dashboard' },
  { label: t('nav.projects'), to: '/projects', icon: 'i-lucide-folder-open' },
  { label: 'Master Data', to: '/master-data', icon: 'i-lucide-database' },
])

const userMenuItems = computed(() => [
  [
    {
      label: authStore.user?.name ?? 'Profil',
      icon: 'i-lucide-user',
      to: '/profile',
    },
  ],
  [
    {
      label: t('nav.logout'),
      icon: 'i-lucide-log-out',
      click: () => authStore.logout(),
    },
  ],
])
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-150 flex flex-col">
    <!-- Top Navigation Bar -->
    <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 shrink-0">
      <div class="px-4 h-14 flex items-center gap-3">
        <!-- Mobile Hamburger Button (< lg) -->
        <UButton
          icon="i-lucide-menu"
          color="gray"
          variant="ghost"
          size="sm"
          class="lg:hidden"
          title="Buka Menu"
          @click="isMobileOpen = true"
        />

        <!-- Desktop Toggle Button in Header (Always Available) -->
        <UButton
          :icon="isCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
          color="gray"
          variant="ghost"
          size="sm"
          class="hidden lg:flex"
          :title="isCollapsed ? 'Perbesar Sidebar' : 'Kecilkan Sidebar'"
          @click="toggleSidebar"
        />

        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-2 font-bold text-lg text-primary-600 shrink-0">
          <UIcon name="i-lucide-test-tube-2" class="text-2xl" />
          <span class="hidden sm:inline font-black tracking-tight">QAC Tester</span>
        </NuxtLink>

        <!-- Project Selector -->
        <div class="flex-1 max-w-xs ml-2">
          <USelectMenu
            v-if="projectStore.projects.length > 0"
            :options="projectStore.projects.map(p => ({ label: p.name, value: p.id }))"
            value-attribute="value"
            option-attribute="label"
            :model-value="null"
            placeholder="Pilih proyek..."
            size="sm"
            @update:model-value="(val) => val && navigateTo(`/projects/${val}`)"
          />
        </div>

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- Global Search -->
        <UInput
          icon="i-lucide-search"
          size="sm"
          :placeholder="t('common.search')"
          class="hidden md:block w-64"
        />

        <!-- Dark Mode Toggle Button -->
        <ClientOnly>
          <UButton
            :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
            color="gray"
            variant="ghost"
            size="sm"
            :title="isDark ? 'Mode Terang' : 'Mode Malam'"
            @click="isDark = !isDark"
          />
        </ClientOnly>

        <!-- User Avatar Menu -->
        <UDropdown :items="userMenuItems" :popper="{ placement: 'bottom-end' }">
          <UAvatar
            :text="userInitials"
            size="sm"
            class="cursor-pointer ring-2 ring-primary-500/20"
            :alt="authStore.user?.name"
          />
        </UDropdown>
      </div>
    </header>

    <!-- Main Container -->
    <div class="flex-1 flex min-h-0">
      
      <!-- DESKTOP STICKY SIDEBAR -->
      <aside
        class="hidden lg:flex flex-col sticky top-14 h-[calc(100vh-3.5rem)] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 shrink-0 select-none z-30"
        :class="isCollapsed ? 'w-16' : 'w-56'"
      >
        <!-- Top Section: Minimize/Expand Toggle Button -->
        <div class="shrink-0 p-3 pb-2 border-b border-gray-100 dark:border-gray-800/60">
          <div class="flex items-center" :class="isCollapsed ? 'justify-center' : 'justify-between px-1'">
            <span v-if="!isCollapsed" class="text-[11px] font-bold uppercase text-gray-400 tracking-wider">
              Navigasi
            </span>
            <UButton
              :icon="isCollapsed ? 'i-lucide-chevrons-right' : 'i-lucide-chevrons-left'"
              size="xs"
              color="gray"
              variant="soft"
              :class="isCollapsed ? 'w-10 h-8 flex items-center justify-center ring-1 ring-gray-200 dark:ring-gray-700 bg-gray-50 dark:bg-gray-800' : ''"
              :title="isCollapsed ? 'Perbesar Sidebar' : 'Kecilkan Sidebar'"
              @click="toggleSidebar"
            />
          </div>
        </div>

        <!-- Middle Section: Scrollable Navigation Links -->
        <nav class="flex-1 overflow-y-auto px-2 py-3 space-y-1.5">
          <UTooltip
            v-for="item in navItems"
            :key="item.to"
            :text="item.label"
            :prevent="!isCollapsed"
            popper-class="text-xs font-semibold"
          >
            <UButton
              :to="item.to"
              :icon="item.icon"
              :label="isCollapsed ? undefined : item.label"
              color="gray"
              variant="ghost"
              class="w-full text-xs font-semibold"
              :class="[
                isCollapsed ? 'justify-center px-0 h-10' : 'justify-start h-9',
                (item.to === '/' ? route.path === '/' : route.path.startsWith(item.to))
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/80 dark:text-primary-300 font-bold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/80'
              ]"
            />
          </UTooltip>
        </nav>

        <!-- Bottom Section: PERMANENTLY STICKY ADMIN SECTION (NEVER SCROLLS AWAY) -->
        <div
          v-if="authStore.isAdmin"
          class="shrink-0 p-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky bottom-0 z-10"
        >
          <div v-if="!isCollapsed" class="px-2 pb-1 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
            Sistem
          </div>
          <UTooltip
            :text="t('nav.admin')"
            :prevent="!isCollapsed"
            popper-class="text-xs font-semibold"
          >
            <UButton
              to="/admin"
              icon="i-lucide-shield"
              :label="isCollapsed ? undefined : t('nav.admin')"
              color="gray"
              variant="ghost"
              class="w-full text-xs font-semibold"
              :class="[
                isCollapsed ? 'justify-center px-0 h-10' : 'justify-start h-9',
                route.path.startsWith('/admin')
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/80 dark:text-primary-300 font-bold'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/80'
              ]"
            />
          </UTooltip>
        </div>
      </aside>

      <!-- MOBILE SLIDEOVER DRAWER (< lg) -->
      <USlideover v-model="isMobileOpen" side="left">
        <div class="h-full flex flex-col bg-white dark:bg-gray-900 p-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <NuxtLink to="/" class="flex items-center gap-2 font-bold text-lg text-primary-600" @click="isMobileOpen = false">
              <UIcon name="i-lucide-test-tube-2" class="text-2xl" />
              <span>QAC Tester</span>
            </NuxtLink>
            <UButton icon="i-lucide-x" color="gray" variant="ghost" size="xs" @click="isMobileOpen = false" />
          </div>

          <nav class="flex-1 py-4 space-y-2">
            <UButton
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              :icon="item.icon"
              :label="item.label"
              color="gray"
              variant="ghost"
              class="w-full justify-start text-sm"
              :class="(item.to === '/' ? route.path === '/' : route.path.startsWith(item.to)) ? 'bg-primary-50 text-primary-700 font-bold' : ''"
              @click="isMobileOpen = false"
            />
          </nav>

          <div v-if="authStore.isAdmin" class="border-t border-gray-100 dark:border-gray-800 pt-3">
            <UButton
              to="/admin"
              icon="i-lucide-shield"
              :label="t('nav.admin')"
              color="gray"
              variant="ghost"
              class="w-full justify-start text-sm"
              @click="isMobileOpen = false"
            />
          </div>
        </div>
      </USlideover>

      <!-- Page Content Slot -->
      <div class="flex-1 min-w-0 min-h-[calc(100vh-3.5rem)] overflow-y-auto">
        <slot />
      </div>
    </div>
  </div>
</template>
