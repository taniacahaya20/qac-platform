export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
  ],

  i18n: {
    defaultLocale: 'id',
    locales: [
      { code: 'id', name: 'Bahasa Indonesia', file: 'id.json' },
      { code: 'en', name: 'English', file: 'en.json' },
    ],
    langDir: 'locales/',
    strategy: 'no_prefix',
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? 'http://localhost:3001',
      appName: process.env.NUXT_PUBLIC_APP_NAME ?? 'QAC Tester',
    },
  },

  colorMode: {
    preference: 'light',
  },

  typescript: {
    strict: true,
    typeCheck: false,
  },

  css: [],

  app: {
    head: {
      title: 'QAC Tester',
      titleTemplate: '%s — QAC Tester',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
})
