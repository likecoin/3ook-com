<template>
  <aside
    v-if="isUserBookOwner || isPlusReadingCtaVisible || (!isLibrary && pricingItems.length)"
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
      class="cursor-pointer"
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
            class="cursor-pointer"
          />
        </UDropdownMenu>
      </UFieldGroup>

      <div
        v-if="!isLibrary && pricingItems.length"
        class="flex items-center justify-between flex-wrap gap-2"
      >
        <span class="shrink-0 space-x-0.5 text-xl font-semibold leading-none">
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

        <div class="flex items-center gap-1">
          <UButton
            v-if="canBePurchased"
            icon="i-material-symbols-featured-seasonal-and-gifts-rounded"
            color="neutral"
            variant="outline"
            size="sm"
            :ui="{ base: 'cursor-pointer rounded-full p-1.5' }"
            :aria-label="$t('product_page_gift_button_label')"
            :title="$t('product_page_gift_button_label')"
            @click="emit('gift')"
          />
          <UButton
            :icon="isInBookList ? 'i-material-symbols-favorite-rounded' : 'i-material-symbols-add-2-rounded'"
            color="neutral"
            variant="outline"
            size="sm"
            :ui="{ base: 'cursor-pointer rounded-full p-1.5' }"
            :loading="isCheckingBookList || isUpdatingBookList"
            :aria-label="$t(isInBookList ? 'product_page_remove_from_book_list_button_label' : 'product_page_add_to_book_list_button_label')"
            :title="$t(isInBookList ? 'product_page_remove_from_book_list_button_label' : 'product_page_add_to_book_list_button_label')"
            @click="emit('bookList')"
          />
        </div>
      </div>

      <div class="flex gap-2">
        <UButton
          v-if="!isLibrary && pricingItems.length"
          v-bind="checkoutButtonProps"
          class="flex-1 cursor-pointer justify-center"
          color="primary"
          size="xl"
          :loading="isPurchasing"
          :disabled="!canBePurchased"
          @click="emit('purchase')"
        />
        <UButton
          v-if="isPlusReadingCtaVisible"
          :variant="plusReadingCtaVariant"
          class="flex-1 cursor-pointer justify-center"
          :label="plusReadingCtaLabel"
          size="xl"
          @click="emit('plusRead')"
        />
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import type { ProductStickyBarProps } from './ProductStickyBar.props'

defineProps<ProductStickyBarProps>()

const emit = defineEmits<{
  read: []
  plusRead: []
  gift: []
  bookList: []
  purchase: []
}>()

const { t: $t } = useI18n()
</script>
