<template>
  <!--
  Sticky Plus upsell for a publisher's owner_wallet listing.
  Render it as the last child of the listing, so it docks above AppTabBar
  while scrolling and rests in the flow at the end. The parent owns dismissal.
  -->
  <UAlert
    ref="ownerWalletPlusCTA"
    color="neutral"
    variant="solid"
    orientation="horizontal"
    icon="i-material-symbols-auto-stories-rounded"
    :title="$t(`owner_wallet_plus_cta_${variant}_title`)"
    :description="$t(`owner_wallet_plus_cta_${variant}_description`)"
    :actions="actions"
    :close="{
      variant: 'ghost',
      color: 'neutral',
      ui: { base: 'rounded-full text-gray-700 hover:bg-black/10' },
    }"
    :ui="{
      root: 'sticky bottom-[calc(var(--intercom-launcher-offset)+1rem)] z-30 w-full max-w-xl mt-6 items-center gap-3 rounded-xl shadow-lg bg-theme-cyan text-gray-700 ring-0',
      title: 'text-sm font-bold text-theme-black',
      description: 'text-xs text-gray-700',
      icon: 'size-6 text-gray-700',
    }"
    @update:open="emit('dismiss')"
  />
</template>

<script setup lang="ts">
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

const actions = [{
  label: $t('owner_wallet_plus_cta_button'),
  to: localeRoute({ name: 'member', query: { ll_source: slot } }),
  color: 'neutral' as const,
  variant: 'solid' as const,
  onClick: handlePlusUpsellClick,
}]
</script>
