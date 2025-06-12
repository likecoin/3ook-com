<template>
  <div class="flex flex-col grow">
    <AppHeader :is-connect-hidden="false" />
  </div>
</template>

<script setup lang="ts">
let paywallModal: ReturnType<typeof usePayWall> | null = null
const hasOpened = ref(false)

onMounted(() => {
  if (!hasOpened.value) {
    hasOpened.value = true
    if (!paywallModal) {
      paywallModal = usePayWall({
        isFullScreen: true,
        dismissible: false,
      })
    }
    paywallModal.open()
  }
})
</script>
