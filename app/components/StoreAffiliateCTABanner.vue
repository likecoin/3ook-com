<template>
  <!--
  Prompt non-Plus visitors to subscribe through this affiliate
  to unlock the exclusive voice these curated books can be read with.
  -->
  <UAlert
    color="neutral"
    variant="subtle"
    :title="$t('store_affiliate_cta_title', { name: displayName })"
    :description="$t('store_affiliate_cta_description', { name: displayName })"
    :actions="[
      {
        label: $t('store_affiliate_cta_button'),
        color: 'primary',
        to: subscribeRoute,
      },
    ]"
    :style="{ '--backdrop-image': `url(${affiliateCTABackdropImageSrc})` }"
    :ui="{
      root: 'max-phone:flex-row-reverse affiliate-cta-banner bg-cover laptop:bg-size-[50%] bg-no-repeat bg-right rounded-xl',
      title: 'text-highlighted text-lg font-bold',
    }"
  >
    <template #leading>
      <div class="relative">
        <UAvatar
          :src="avatarSrc"
          :alt="displayName"
          icon="i-material-symbols-person-2-rounded"
          :ui="{
            root: 'size-14 phone:size-18',
            image: 'border border-2 border-theme-cyan',
          }"
        />
        <!-- For deco -->
        <UAvatar
          class="absolute -bottom-0.5 -right-0.5 bg-theme-black"
          icon="i-material-symbols-graphic-eq-rounded"
          size="xs"
          :ui="{ icon: 'text-theme-cyan' }"
        />
      </div>
    </template>
  </UAlert>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import affiliateCTABackdropImageSrc from '~/assets/images/affiliate-cta-banner-backdrop.webp'

defineProps<{
  displayName: string
  avatarSrc: string
  subscribeRoute?: RouteLocationRaw
}>()

const { t: $t } = useI18n()
</script>

<style scoped>
.affiliate-cta-banner {
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

.dark .affiliate-cta-banner {
  --banner-tint: #052e2a;
}
</style>
