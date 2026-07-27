<template>
  <UAlert
    v-if="isVisible"
    :title="$t('library_intro_banner_title')"
    :description="$t('library_intro_banner_description')"
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
      root: 'library-intro-banner rounded-xl bg-cover phone:bg-size-[30%] bg-no-repeat bg-right',
      title: 'font-bold text-highlighted text-lg',
    }"
    @update:open="handleDismiss"
  />
</template>

<script setup lang="ts">
import { useMounted } from '@vueuse/core'

import backdropImageSrc from '~/assets/images/library-intro-banner-backdrop.webp'

const { t } = useI18n()
const localeRoute = useLocaleRoute()
const { isPlusOrDevicePlus } = useDevicePlusEntitlement()

const { isDismissed, dismissLibraryIntroBanner } = useLibraryIntroBanner()
// Gate behind mount so the SSR'd grid doesn't hydrate-mismatch on persisted state.
const isMounted = useMounted()
const isVisible = computed(() => isMounted.value && !isDismissed.value)

// Plus members already subscribe, so point them to the explainer; others to the paywall.
const actions = computed(() => [{
  label: isPlusOrDevicePlus.value
    ? t('library_intro_banner_cta_about')
    : t('library_intro_banner_cta_member'),
  to: isPlusOrDevicePlus.value
    ? localeRoute({ name: 'about', hash: '#library', query: { ll_source: 'library-intro' } })
    : localeRoute({ name: 'member', query: { ll_source: 'library-intro' } }),
  color: 'primary' as const,
  trailingIcon: 'i-material-symbols-arrow-forward-rounded',
  onClick: handleCTAClick,
}])

function handleDismiss() {
  dismissLibraryIntroBanner()
  useLogEvent('library_intro_dismiss')
}

function handleCTAClick() {
  useLogEvent('library_intro_cta_click', { is_plus: isPlusOrDevicePlus.value })
  // Plus members are sent to the explainer, not the paywall — not an upsell.
  if (isPlusOrDevicePlus.value) return
  useLogPlusUpsell('click', { llMedium: 'library-intro', llSource: 'library' })
}
</script>

<style scoped>
.library-intro-banner {
  --banner-tint: #f0fdf9;
  background-color: var(--banner-tint);
  background-image:
    linear-gradient(
      to right,
      var(--banner-tint),
      color-mix(in oklab, var(--banner-tint) 85%, transparent)
    ),
    var(--backdrop-image);
}

.dark .library-intro-banner {
  --banner-tint: #052e2a;
}
</style>
