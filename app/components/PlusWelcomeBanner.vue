<template>
  <UAlert
    color="neutral"
    variant="soft"
    icon="i-material-symbols-celebration-rounded"
    :title="$t('plus_welcome_banner_title')"
    :description="description"
    :close="{
      variant: 'soft',
      color: 'neutral',
      ui: { base: 'rounded-full' },
    }"
    :style="{ '--backdrop-image': `url(${plusWelcomeBannerBackdropImageSrc})` }"
    :ui="{
      root: 'plus-welcome-banner items-center text-theme-black bg-cover laptop:bg-size-[50%] bg-no-repeat bg-right rounded-xl',
      title: 'text-lg font-bold',
    }"
    @update:open="emit('dismiss')"
  >
    <template #leading>
      <UIcon
        name="i-material-symbols-celebration-rounded"
        class="size-8"
      />

      <!-- Plus deco -->
      <img
        :class="[
          'absolute',
          'right-1/2', 'phone:right-0',
          'w-12',
          'phone:mr-10',
          'opacity-35', 'phone:opacity-50',
          'scale-700', 'phone:scale-500',
          'origin-center', 'phone:origin-right',
          'mix-blend-multiply',
        ]"
        :src="plusLogoSrc"
      >
    </template>
  </UAlert>
</template>

<script setup lang="ts">
import plusLogoSrc from '~/assets/images/plus-logo.svg?url'
import plusWelcomeBannerBackdropImageSrc from '~/assets/images/plus-welcome-banner-backdrop.webp'

defineProps<{
  description: string
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const { t: $t } = useI18n()
</script>

<style scoped>
.plus-welcome-banner {
  --banner-tint: var(--color-theme-cyan);
  background-color: var(--banner-tint);
  background-image:
    linear-gradient(
      to right,
      var(--banner-tint),
      color-mix(in oklab, var(--banner-tint) 85%, transparent)
    ),
    var(--backdrop-image);
}
</style>
