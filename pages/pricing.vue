<template>
  <div class="flex flex-col grow">
    <AppHeader :is-connect-hidden="false" />
  </div>
</template>

<script setup lang="ts">
const router = useRouter()

const subscription = useSubscription()

const hasOpened = ref(false)

onMounted(async () => {
  const isSubscribed = await subscription.redirectIfSubscribed()
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
