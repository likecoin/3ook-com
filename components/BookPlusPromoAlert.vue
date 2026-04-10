<template>
  <UAlert
    :title="$t('product_page_plus_promo_title')"
    :description="$t('product_page_plus_promo_description')"
    icon="i-material-symbols-celebration-outline-rounded"
    color="secondary"
    variant="subtle"
    orientation="horizontal"
    :ui="{
      root: 'rounded-xl items-center gap-3',
      title: 'text-sm font-bold',
      description: 'text-xs',
      icon: 'size-5',
    }"
  />
</template>
