<template>
  <ul class="space-y-2">
    <li
      v-for="(item, index) in items"
      :key="index"
    >
      <button
        :class="[
          'flex',
          'items-center',
          'gap-3',
          'dark:bg-neutral-800',
          'hover:bg-muted',
          'hover:dark:bg-neutral-700/50',
          'rounded-lg',
          'w-full',
          'p-4',
          'border-2',
          item.isSelected
            ? 'border-neutral-900 dark:border-neutral-300'
            : 'border-neutral-300 dark:border-neutral-700',
          'transition-[background-color, border-color]',
          'duration-200',
          'ease-in-out',
          { 'cursor-pointer': !item.isSoldOut },
        ]"
        :aria-pressed="item.isSelected"
        :disabled="item.isSoldOut"
        @click="emit('select', index)"
      >
        <div class="relative shrink-0 w-[24px] h-[24px] flex items-center justify-center">
          <span
            :class="[
              'absolute',
              'w-[20px]',
              'h-[20px]',
              item.isSelected ? 'bg-theme-cyan' : 'bg-white dark:bg-black',
              'rounded-full',
              'outline',
              'outline-neutral-300',
            ]"
          />
          <UIcon
            v-if="item.isSelected"
            class="absolute text-neutral-900 z-10"
            name="i-material-symbols-check-circle"
            size="24"
          />
        </div>
        <div class="grow">
          <div
            :class="[
              'flex',
              'justify-between',
              'items-center',
              'gap-3',
              item.isSoldOut ? 'text-dimmed' : 'text-highlighted',
            ]"
          >
            <span
              class="font-semibold text-left"
              v-text="item.label"
            />
            <span
              v-if="item.isSoldOut"
              class="text-sm font-semibold"
              v-text="$t('product_page_sold_out_button_label')"
            />
            <span
              v-else
              class="flex flex-col items-end text-right"
            >
              <template v-if="item?.discountedPrice">
                <span class="flex flex-nowrap items-center text-highlighted font-semibold">
                  <span v-text="item.discountedPrice" />
                  <PlusBadge
                    v-if="isLikerPlus"
                    class="ml-1"
                  />
                </span>
                <span class="text-xs text-dimmed line-through">
                  <span v-text="item.originalPrice" />
                </span>
              </template>
              <template v-else>
                <span
                  class="font-semibold"
                  v-text="item.originalPrice"
                />
              </template>
            </span>
          </div>
          <div
            v-if="item.renderedDescription"
            class="markdown whitespace-normal text-left mt-2"
            v-html="item.renderedDescription"
          />

          <div class="flex flex-wrap gap-1 mt-3">
            <UBadge
              v-for="contentType in contentTypes"
              :key="contentType"
              :label="contentType.toUpperCase()"
              variant="outline"
              color="neutral"
              size="sm"
            />

            <UBadge
              v-if="isDownloadable"
              :label="$t('reading_method_download_file')"
              variant="outline"
              color="neutral"
              size="sm"
            />

            <UBadge
              v-if="isTtsSupported"
              :label="$t('product_page_support_tts_label')"
              variant="subtle"
              :color="ttsTagColor"
              size="sm"
            />

            <UBadge
              v-if="isPlusReadingEnabled"
              :label="$t('product_page_plus_reading_label')"
              variant="subtle"
              :color="plusReadingTagColor"
              size="sm"
            />
          </div>
        </div>
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { ProductPricingSelectorProps } from './ProductPricingSelector.props'

defineProps<ProductPricingSelectorProps>()

const emit = defineEmits<{
  select: [index: number]
}>()

const { t: $t } = useI18n()
</script>
