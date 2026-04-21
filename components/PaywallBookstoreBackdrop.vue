<template>
  <div
    :class="[
      'absolute',
      'top-0',
      'inset-x-0',
      // NOTE: Approx. 2x actual height of the backdrop image
      'h-[4000px]',
      'bg-repeat-y',
      'bg-top',
      'opacity-50',
      'blur-[1px]',
      'paywall-bookstore-backdrop-scroll-animation',
      'pointer-events-none',
    ]"
    :style="{ backgroundImage: `url(${backdrop})` }"
  />
</template>

<script lang="ts" setup>
import backdrop from '~/assets/images/paywall/bg-bookstore.jpg'
</script>

<style scoped>
.paywall-bookstore-backdrop-scroll-animation {
  animation: paywall-bookstore-backdrop-scroll 90s linear infinite;
  will-change: transform;
}

@keyframes paywall-bookstore-backdrop-scroll {
  0% {
    transform: translateY(0%);
  }
  100% {
    transform: translateY(-50%);
  }
}
</style>
