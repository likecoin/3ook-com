<template>
  <div class="flex flex-col grow">
    <AppHeader :is-connect-hidden="false" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const localeRoute = useLocaleRoute()

const subscription = useSubscription()

const hasOpened = ref(false)

onMounted(async () => {
  const isSubscribed = await subscription.checkLikerPlusStatus()
  if (isSubscribed) return

  if (!hasOpened.value) {
    hasOpened.value = true
    subscription.paywallModal.open({
      isFullScreen: true,
      onClose: () => {
        router.back()
      },
    })
  }
})
</script>
