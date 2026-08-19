<template>
  <UAlert
    v-if="isVisible"
    ref="storeIntroUpsell"
    :description="isPlusVariant ? $t('store_intro_plus_banner_description') : $t('store_intro_banner_description')"
    :actions="actions"
    :close="{
      variant: 'solid',
      color: 'neutral',
      ui: { base: 'relative rounded-full' },
    }"
    color="neutral"
    variant="subtle"
    :style="{ '--backdrop-image': `url(${backdropImageSrc})` }"
    :ui="{
      root: 'store-intro-banner rounded-xl bg-cover tablet:bg-size-[60%] bg-no-repeat bg-right light:ring-0',
      wrapper: 'pr-16',
      title: 'flex items-center gap-1.5 font-bold text-theme-cyan text-lg',
      description: 'text-theme-white',
    }"
    @update:open="handleDismiss"
  >
    <template #title>
      <span
        v-if="isPlusVariant"
        v-text="$t('store_intro_plus_banner_title')"
      />
      <i18n-t
        v-else
        keypath="store_intro_banner_title"
      >
        <template #siteName>
          <AppLogo
            class="inline h-[0.9em] align-middle"
            :is-icon="false"
            :is-padded="false"
            aria-label="3ook.com"
          />
        </template>
      </i18n-t>
    </template>
    <template #leading>
      <img
        :class="[
          'absolute',
          'phone:right-0',
          'max-phone:left-full',
          'top-1/2',
          'max-phone:-translate-x-1',
          'phone:-translate-y-3',
          'w-12',
          'mr-13',
          'scale-300', 'phone:scale-400',
          'origin-right',
        ]"
        :src="mockupImageSrc"
        alt=""
        aria-hidden="true"
      >
    </template>
  </UAlert>
</template>

<script setup lang="ts">
import { useTimeout, whenever } from '@vueuse/core'

import mockupImageSrc from '~/assets/images/mockup.png'
import backdropImageSrc from '~/assets/images/plus-welcome-banner-backdrop.webp'

const FLAG_FALLBACK_TIMEOUT_MS = 1500

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()

// Mount and persisted dismiss are owned by the parent's v-if; this component
// adds the variant gate and logs its own view.
const { dismissStoreIntroBanner } = useStoreIntroBanner()

const storeIntroCopyABTest = useABTest({ experimentKey: 'store-intro-banner-copy' })
// `variant` stays null until PostHog resolves the flag, and forever when it
// can't — blocked script, unset key, failed /flags.
const hasFlagTimedOut = useTimeout(FLAG_FALLBACK_TIMEOUT_MS)
const pendingVariant = computed(() =>
  storeIntroCopyABTest.variant.value ?? (hasFlagTimedOut.value ? 'control' : null),
)
// Fall back to control and latch the first decision: the impression observer
// only re-reads eligibility on a visibility change, so a later resolution
// would swap the copy under a reader and lose the event.
const resolvedVariant = ref<string | null>(null)
whenever(pendingVariant, (next) => {
  resolvedVariant.value = next
}, { once: true })
const isPlusVariant = computed(() => resolvedVariant.value === 'plus')
const isVisible = computed(() => !!resolvedVariant.value)

usePlusUpsellImpression({
  templateRef: 'storeIntroUpsell',
  slot: 'store-intro',
  source: 'store',
  isEligible: () => isPlusVariant.value,
})

const actions = computed(() => [{
  label: isPlusVariant.value ? $t('store_intro_plus_banner_cta') : $t('store_intro_banner_cta'),
  to: isPlusVariant.value
    ? localeRoute({ name: 'member', query: { ll_source: 'store-intro' } })
    : localeRoute({ name: 'about', query: { ll_source: 'store-intro' } }),
  color: 'neutral' as const,
  variant: 'outline' as const,
  trailingIcon: 'i-material-symbols-arrow-forward-rounded',
  ui: {
    label: 'light:text-inverted',
    trailingIcon: 'light:text-inverted',
  },
  onClick: handleCTAClick,
}])

// Setup runs before the flag resolves, so log on the gate rather than on mount.
// Both arms keep reporting the legacy event, so the CTR read stays comparable.
whenever(isVisible, () => useLogEvent('store_intro_view'), { once: true })

function handleDismiss() {
  dismissStoreIntroBanner()
  useLogEvent('store_intro_dismiss')
}

function handleCTAClick() {
  useLogEvent('store_intro_cta_click')
  // Only the arm that routes to the paywall is an upsell.
  if (!isPlusVariant.value) return
  useLogPlusUpsell('click', { llMedium: 'store-intro', llSource: 'store' })
}
</script>

<style scoped>
/* Dark tint, opaque on the left for legible text, fading full-width into the
   backdrop. The 70% tint floor keeps the right from going fully transparent so
   the left↔right contrast stays gentle. */
.store-intro-banner {
  --banner-tint: var(--color-theme-black);
  background-color: var(--banner-tint);
  background-image:
    linear-gradient(
      to right,
      var(--banner-tint),
      color-mix(in oklab, var(--banner-tint) 70%, transparent)
    ),
    var(--backdrop-image);
}
</style>
