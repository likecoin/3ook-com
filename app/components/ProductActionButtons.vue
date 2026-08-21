<template>
  <div :class="['flex flex-col', gapClass]">
    <!-- [購買/再次購買/免費擁有][🛒][🎁] -->
    <UFieldGroup
      v-if="isCheckoutVisible"
      class="w-full"
      :size="size"
    >
      <UButton
        v-bind="checkoutButtonProps"
        class="flex-1 justify-center"
        :loading="isPurchasing"
        :disabled="!canBePurchased"
        @click="emit('purchase')"
      />
      <UTooltip
        v-if="isCartCtaVisible"
        :text="bookListButtonProps.label"
      >
        <UButton
          class="border-l-2 border-current/25"
          variant="solid"
          color="primary"
          :icon="bookListButtonProps.icon"
          :aria-label="bookListButtonProps.label"
          :loading="isBookListLoading"
          @click="emit('bookList')"
        />
      </UTooltip>
      <UTooltip
        v-if="isGiftCtaVisible"
        :text="$t('product_page_gift_button_label')"
      >
        <UButton
          class="border-l-2 border-current/25"
          variant="solid"
          color="primary"
          icon="i-material-symbols-featured-seasonal-and-gifts-rounded"
          :aria-label="$t('product_page_gift_button_label')"
          @click="emit('gift')"
        />
      </UTooltip>
    </UFieldGroup>

    <!-- [閱讀] for owners; otherwise [借閱][試閱] side by side in the store, stacked in the library -->
    <div
      v-if="isUserBookOwner || isPlusReadingCtaVisible || isPreviewCtaVisible"
      :class="['flex', { 'flex-col': isLibrary }, gapClass]"
    >
      <UButton
        v-if="isUserBookOwner"
        :variant="readButtonVariant"
        class="flex-1 justify-center"
        :label="$t('product_page_read_button_label')"
        :size="size"
        @click="emit('read')"
      />
      <UButton
        v-if="isPlusReadingCtaVisible"
        :variant="plusReadingCtaVariant"
        class="flex-[2] justify-center"
        :label="plusReadingCtaLabel"
        :leading-icon="plusReadingCtaIcon"
        :size="size"
        @click="emit('plusRead')"
      />
      <UButton
        v-if="isPreviewCtaVisible"
        class="flex-1 justify-center"
        variant="outline"
        color="primary"
        :label="$t('product_page_preview_button_label')"
        :size="size"
        @click="emit('preview')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductActionButtonsProps } from './ProductActionButtons.props'

const props = defineProps<ProductActionButtonsProps>()

const emit = defineEmits<{
  purchase: []
  bookList: []
  gift: []
  read: []
  plusRead: []
  preview: []
}>()

const { t: $t } = useI18n()

const gapClass = computed(() => (props.size === 'xl' ? 'gap-3' : 'gap-2'))
</script>
