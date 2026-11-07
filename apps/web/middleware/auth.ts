export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore()

  // Skip auth check for login page
  if (to.path === '/login') {
    if (authStore.isLoggedIn) return navigateTo('/')
    return
  }

  // Try to fetch current user if not initialized
  if (!authStore.initialized) {
    const ok = await authStore.fetchMe()
    if (!ok) return navigateTo('/login')
  } else if (!authStore.isLoggedIn) {
    return navigateTo('/login')
  }
})
