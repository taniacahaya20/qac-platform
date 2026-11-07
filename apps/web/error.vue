<script setup lang="ts">
const error = useError()

function handleError() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="text-center max-w-md">
      <div class="text-8xl font-bold text-primary-600 mb-4">
        {{ error?.statusCode ?? '?' }}
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">
        {{ error?.statusCode === 404 ? 'Halaman Tidak Ditemukan' : 'Terjadi Kesalahan' }}
      </h1>
      <p class="text-gray-500 mb-6">
        {{ error?.statusCode === 404
          ? 'Halaman yang Anda cari tidak tersedia.'
          : 'Terjadi kesalahan yang tidak terduga.' }}
      </p>
      <UButton label="Kembali ke Dashboard" icon="i-lucide-home" @click="handleError" />
    </div>
  </div>
</template>
