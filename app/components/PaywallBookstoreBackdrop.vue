<template>
  <div
    :class="[
      'absolute',
      'top-0',
      'inset-x-0',
      'h-[200%]',
      'bg-repeat',
      'bg-top',
      'opacity-30',
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

/* Clearing will-change matters as much as the animation: it would otherwise
   keep a full-bleed blurred image on its own compositor layer while static. */
@media (prefers-reduced-motion: reduce) {
  .paywall-bookstore-backdrop-scroll-animation {
    animation: none;
    will-change: auto;
  }
}
</style>
