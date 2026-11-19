<template>
  <!--
  Sticky Plus upsell for a publisher's owner_wallet listing.
  Render it as the last child of the listing, so it docks above AppTabBar
  while scrolling and rests in the flow at the end. The parent owns dismissal.
  On mobile it stops short of the Intercom launcher and sits on its baseline,
  so neither covers the other.
  -->
  <UAlert
    ref="ownerWalletPlusCTA"
    :title="$t(`owner_wallet_plus_cta_${variant}_title`)"
    :description="$t(`owner_wallet_plus_cta_${variant}_description`)"
    :actions="actions"
    :close="closeButton"
    color="neutral"
    variant="subtle"
    :style="{ '--backdrop-image': `url(${backdropImageSrc})` }"
    :ui="{
      root: 'dark-backdrop-banner sticky bottom-(--intercom-launcher-bottom) z-30 mt-6 max-md:self-start max-md:w-[calc(100%-79px)] md:mx-auto md:max-w-lg rounded-xl shadow-lg shadow-black/20 bg-cover bg-no-repeat bg-right light:ring-0',
      title: 'font-bold text-theme-cyan text-lg',
      description: 'text-theme-white',
      close: `${TOUCH_TARGET_CLASS} before:-inset-1.5 size-8 justify-center rounded-full bg-theme-white/15 hover:bg-theme-white/25`,
    }"
    @update:open="emit('dismiss')"
  />
</template>

<script setup lang="ts">
import backdropImageSrc from '~/assets/images/plus-welcome-banner-backdrop.webp'

// Grows the hit area to 44px while the button keeps its visual size.
const TOUCH_TARGET_CLASS = 'relative before:absolute before:content-[\'\']'

const props = defineProps<{
  isLibrary?: boolean
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const { t: $t } = useI18n()
const localeRoute = useLocaleRoute()

const slot = 'owner-wallet-cta'
const variant = props.isLibrary ? 'library' : 'store'

const { handlePlusUpsellClick } = usePlusUpsellSlot({
  templateRef: 'ownerWalletPlusCTA',
  slot,
  source: variant,
})

// Nuxt UI's close label isn't localised.
// Built outside the template, since ButtonProps doesn't declare aria-label.
const closeButton = computed(() => ({
  'variant': 'ghost' as const,
  'aria-label': $t('common_close'),
  'ui': { leadingIcon: 'size-5 text-theme-white' },
}))

const actions = computed(() => [{
  label: $t('owner_wallet_plus_cta_button'),
  to: localeRoute({ name: 'member', query: { ll_source: slot } }),
  size: 'lg' as const,
  color: 'neutral' as const,
  variant: 'outline' as const,
  trailingIcon: 'i-material-symbols-arrow-forward-rounded',
  class: `${TOUCH_TARGET_CLASS} before:inset-x-0 before:-inset-y-1`,
  ui: {
    label: 'light:text-inverted',
    trailingIcon: 'light:text-inverted',
  },
  onClick: handlePlusUpsellClick,
}])
</script>
