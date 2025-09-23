<template>
  <li
    ref="lazyLoadTrigger"
    class="grid grid-cols-12 gap-2 items-center py-3"
  >
    <div class="col-span-1">
      <UCheckbox
        :model-value="!isSoldOut && isSelected"
        :disabled="isSoldOut"
        @update:model-value="handleCheckboxValueChange"
      />
    </div>
    <div class="col-span-9 flex items-center gap-4">
      <BookCover
        class="w-[60px] laptop:w-[100px] shrink-0"
        :src="bookCoverSrc"
        :alt="bookInfo.name.value"
        :to="bookInfo.productPageRoute.value"
        :is-vertical-center="true"
        @click="emit('click-cover', { nftClassId, priceIndex })"
      />

      <div>
        <div
          class="laptop:text-lg font-semibold line-clamp-2"
          v-text="bookInfo.name.value"
        />
        <div
          class="max-laptop:text-xs text-sm text-muted line-clamp-2"
          v-text="pricingItem?.name"
        />
        <div class="mt-1 text-sm text-gray-900">
          <span
            v-if="isSoldOut"
            v-text="$t('book_list_item_sold_out')"
          />
          <template v-else-if="pricingItem">
            <span
              v-if="originalPrice > 0"
              class="mr-0.5 font-semibold"
              v-text="currency"
            />
            <template v-if="formattedDiscountedPrice">
              <span
                v-if="formattedDiscountedPrice"
                class="font-semibold"
                v-text="formattedDiscountedPrice"
              />
              <PlusBadge class="inline ml-1" />
              <span class="block text-xs text-gray-400 line-through">
                <span
                  class="mr-0.5"
                  v-text="currency"
                />
                <span v-text="formattedOriginalPrice" />
              </span>
            </template>
            <span
              v-else
              class="font-semibold"
              v-text="formattedOriginalPrice"
            />
          </template>
        </div>
      </div>
    </div>
    <div class="flex justify-end col-span-2">
      <UTooltip :text="$t('book_list_item_remove_tooltip_text')">
        <UButton
          icon="i-material-symbols-delete-outline-rounded"
          variant="outline"
          color="neutral"
          @click="emit('remove', { nftClassId, priceIndex })"
        />
      </UTooltip>
    </div>
  </li>
</template>

<script setup lang="ts">
const props = defineProps({
  nftClassId: {
    type: String,
    required: true,
  },
  priceIndex: {
    type: Number,
    default: 0,
  },
  isSelected: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['click-cover', 'remove', 'select', 'unselect'])

const nftStore = useNFTStore()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const { getPlusDiscountPrice } = useSubscription()
const { getResizedImageURL } = useImageResize()

const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

const { t: $t } = useI18n()

useVisibility('lazyLoadTrigger', (isVisible) => {
  if (isVisible) {
    nftStore.lazyFetchNFTClassAggregatedMetadataById(props.nftClassId).catch(() => {
      console.warn(`Failed to fetch aggregated metadata for the NFT class [${props.nftClassId}]`)
    })
  }
})

const { formatPrice } = useCurrency()

const pricingItem = computed(() => bookInfo.pricingItems.value[props.priceIndex])
const originalPrice = computed(() => pricingItem.value?.price || 0)
const formattedOriginalPrice = computed(() => formatPrice(originalPrice.value))
const formattedDiscountedPrice = computed(() => {
  const discountedPrice = getPlusDiscountPrice(originalPrice.value)
  return discountedPrice ? formatPrice(discountedPrice) : null
})
const currency = computed(() => pricingItem.value?.currency || 'USD')
const isSoldOut = computed(() => pricingItem.value?.isSoldOut || false)

function handleCheckboxValueChange(isSelected: boolean | 'indeterminate') {
  emit(typeof isSelected === 'string' || !isSelected ? 'unselect' : 'select', {
    nftClassId: props.nftClassId,
    priceIndex: props.priceIndex,
  })
}

watch(() => props.isSelected, (isSelected) => {
  if (isSelected && isSoldOut.value) {
    emit('unselect', {
      nftClassId: props.nftClassId,
      priceIndex: props.priceIndex,
    })
  }
})
</script>
