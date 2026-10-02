<template>
  <li class="flex flex-col justify-end text-sm text-muted">
    <NuxtLink
      :to="giftPlusRoute"
      :class="[
        'group',
        'flex flex-col items-center justify-center gap-3',
        'aspect-2/3',
        'p-4',
        'rounded-lg',
        'bg-theme-black',
        'text-theme-cyan',
        'shadow-lg',
      ]"
    >
      <UIcon
        class="size-12 transition-transform group-hover:scale-110"
        name="i-material-symbols-featured-seasonal-and-gifts-rounded"
      />
      <span
        class="text-center text-sm font-semibold text-white"
        v-text="$t('store_gift_plus_card_cta')"
      />
    </NuxtLink>

    <div class="mt-2 min-h-[3.2lh]">
      <div
        class="laptop:text-base text-highlighted font-semibold line-clamp-2"
        v-text="$t('gift_plus_title')"
      />
      <div
        class="h-lh mt-[0.5lh] truncate leading-none text-xs text-toned"
        v-text="$t('store_gift_plus_card_description')"
      />
    </div>

    <!-- Stand-ins for BookstoreItem's price and rank rows, so the grid baselines line up -->
    <div class="h-lh mt-[0.5lh]" />
    <div class="h-lh text-xs" />
  </li>
</template>

<script setup lang="ts">
const props = defineProps({
  llMedium: {
    type: String,
    default: '',
  },
})

const localeRoute = useLocaleRoute()

const giftPlusRoute = computed(() => localeRoute({
  name: 'gift-plus',
  query: props.llMedium ? { ll_medium: props.llMedium } : undefined,
}))
</script>
