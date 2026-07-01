<template>
  <UAlert
    v-if="isVisible"
    :title="$t('store_intro_banner_title')"
    :description="$t('store_intro_banner_description')"
    :actions="actions"
    :close="{
      variant: 'ghost',
      color: 'neutral',
      ui: { base: 'rounded-full' },
    }"
    color="neutral"
    variant="subtle"
    :style="{ '--backdrop-image': `url(${backdropImageSrc})` }"
    :ui="{
      root: 'store-intro-banner rounded-xl bg-cover phone:bg-size-[40%] bg-no-repeat bg-right-top phone:bg-right-bottom',
      title: 'font-bold text-highlighted text-lg',
    }"
    @update:open="handleDismiss"
  />
</template>

<script setup lang="ts">
import { useMounted } from '@vueuse/core'

import backdropImageSrc from '~/assets/images/hero-backdrop.jpg'

const { t } = useI18n()
const localeRoute = useLocaleRoute()

const { isDismissed, dismissStoreIntroBanner } = useStoreIntroBanner()
// Gate behind mount so the SSR'd grid doesn't hydrate-mismatch on persisted state.
const isMounted = useMounted()
const isVisible = computed(() => isMounted.value && !isDismissed.value)

const actions = computed(() => [{
  label: t('store_intro_banner_cta'),
  to: localeRoute({ name: 'about', query: { ll_source: 'store-intro' } }),
  color: 'primary' as const,
  trailingIcon: 'i-material-symbols-arrow-forward-rounded',
  onClick: handleCTAClick,
}])

onMounted(() => {
  if (isVisible.value) useLogEvent('store_intro_view')
})

function handleDismiss() {
  dismissStoreIntroBanner()
  useLogEvent('store_intro_dismiss')
}

function handleCTAClick() {
  useLogEvent('store_intro_cta_click')
}
</script>

<style scoped>
/* Soft mint, opaque on the left for legible text, fading full-width into the
   backdrop. The 25% tint floor keeps the right from going to harsh black so the
   left↔right contrast stays gentle. */
.store-intro-banner {
  --banner-tint: #f0fdf9;
  background-color: var(--banner-tint);
  background-image:
    linear-gradient(
      to right,
      var(--banner-tint),
      color-mix(in oklab, var(--banner-tint) 25%, transparent)
    ),
    var(--backdrop-image);
}
</style>
