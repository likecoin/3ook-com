<template>
  <aside
    v-if="isUserBookOwner || actionButtons.isPlusReadingCtaVisible || (!isLibrary && pricingItems.length)"
    :class="[
      'fixed',
      'bottom-17',
      'inset-x-0',
      'flex tablet:hidden',
      'flex-col',
      'gap-2',
      isApp ? 'mx-2' : 'mr-20',
      'mb-safe',
      'px-4',
      'py-3',
      'bg-default/80',
      'backdrop-blur-sm',
      'border',
      { 'border-l-0': !isApp },
      'border-muted',
      isApp ? 'rounded-2xl' : 'rounded-r-2xl',
      'z-10',
    ]"
  >
    <UButton
      v-if="isUserBookOwner"
      :variant="readButtonVariant"
      :label="$t('product_page_read_button_label')"
      size="xl"
      block
      @click="emit('read')"
    />

    <template v-else>
      <UFieldGroup
        v-if="!isLibrary && pricingItems.length > 1"
        size="xs"
      >
        <UButton
          :label="selectedPricingItem?.label"
          color="neutral"
          variant="outline"
          :ui="{ base: 'cursor-default' }"
        />
        <UDropdownMenu
          :items="stickyEditionDropdownItems"
        >
          <UButton
            icon="i-material-symbols-arrow-drop-down"
            color="neutral"
            variant="outline"
          />
        </UDropdownMenu>
      </UFieldGroup>

      <span
        v-if="actionButtons.isCheckoutVisible && !isPriceHidden"
        class="space-x-0.5 text-xl font-semibold leading-none"
      >
        <span
          v-if="selectedPricingItem?.discountedPrice"
          :class="{ 'text-theme-cyan': selectedPricingItem?.discountedPrice }"
          v-text="selectedPricingItem?.discountedPrice"
        />
        <span
          :class="{ 'text-xs text-dimmed line-through': selectedPricingItem?.discountedPrice }"
          v-text="selectedPricingItem?.originalPrice"
        />
        <PlusBadge
          v-if="isLikerPlus && selectedPricingItem?.discountedPrice"
          class="inline-block"
        />
      </span>

      <ProductActionButtons
        v-bind="actionButtons"
        @purchase="emit('purchase')"
        @book-list="emit('bookList')"
        @gift="emit('gift')"
        @plus-read="emit('plusRead')"
        @preview="emit('preview')"
      />
    </template>
  </aside>
</template>

<script setup lang="ts">
import type { ProductStickyBarProps } from './ProductStickyBar.props'

defineProps<ProductStickyBarProps>()

const emit = defineEmits<{
  read: []
  plusRead: []
  preview: []
  gift: []
  bookList: []
  purchase: []
}>()

const { t: $t } = useI18n()
</script>
