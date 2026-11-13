<template>
  <!--
  Sticky Plus upsell for a publisher's owner_wallet listing.
  Render it as the last child of the listing, so it docks above AppTabBar
  while scrolling and rests in the flow at the end. The parent owns dismissal.
  On mobile it stops short of the Intercom launcher and sits on its baseline,
  so neither covers the other.
  -->
  <div
    ref="ownerWalletPlusCTA"
    class="sticky bottom-(--intercom-launcher-bottom) z-30 mt-6 flex items-center gap-2.5 max-md:self-start w-[calc(100%-79px)] min-h-22 p-3 md:mx-auto md:w-full md:max-w-lg md:min-h-0 md:py-3 md:pl-4 md:pr-2 rounded-2xl shadow-lg shadow-black/20 bg-inverted text-inverted"
  >
    <div class="flex-1 min-w-0 flex flex-col gap-0.5">
      <p
        class="text-sm font-bold text-inverted"
        v-text="$t(`owner_wallet_plus_cta_${variant}_title`)"
      />
      <p
        class="text-xs text-inverted/75"
        v-text="$t(`owner_wallet_plus_cta_${variant}_description`)"
      />
    </div>

    <UButton
      :label="$t('owner_wallet_plus_cta_button')"
      :to="localeRoute({ name: 'member', query: { ll_source: slot } })"
      class="shrink-0 h-11 px-4 rounded-full bg-theme-cyan hover:bg-theme-cyan/90 text-theme-black font-bold"
      @click="handlePlusUpsellClick"
    />

    <!-- The touch target grows upward only, so it never overlaps the join button. -->
    <UButton
      icon="i-material-symbols-close-rounded"
      :aria-label="$t('common_close')"
      color="neutral"
      variant="ghost"
      class="md:hidden absolute -top-3 -right-2.5 size-7 p-0 justify-center rounded-full bg-default hover:bg-default ring-1 ring-default shadow-sm before:absolute before:-inset-x-2 before:-top-4 before:bottom-0 before:content-['']"
      :ui="{ leadingIcon: 'size-4 text-muted' }"
      @click="emit('dismiss')"
    />
    <UButton
      icon="i-material-symbols-close-rounded"
      :aria-label="$t('common_close')"
      color="neutral"
      variant="ghost"
      class="max-md:hidden shrink-0 size-11 justify-center rounded-full hover:bg-inverted/10"
      :ui="{ leadingIcon: 'size-4 text-inverted/70' }"
      @click="emit('dismiss')"
    />
  </div>
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
</script>
