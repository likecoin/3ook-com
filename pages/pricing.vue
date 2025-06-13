<template>
  <div class="flex flex-col grow">
    <AppHeader :is-connect-hidden="false" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const localeRoute = useLocaleRoute()

const paywallModalState = usePayWall({
  isFullScreen: true,
  onClose: () => {
    router.back()
  },
})

const hasOpened = ref(false)

onMounted(() => {
  if (paywallModalState.isLikerPlus.value) {
    navigateTo(localeRoute({ name: 'account' }))
    return
  }

  if (!hasOpened.value) {
    hasOpened.value = true
    paywallModalState.modal.open()
  }
})
</script>
