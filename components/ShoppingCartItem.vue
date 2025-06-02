<template>
  <li
    ref="lazyLoadTrigger"
    class="grid grid-cols-12 gap-2 items-center py-3"
  >
    <div class="col-span-9 flex items-center gap-4">
      <BookCover
        class="w-[60px] laptop:w-[100px] shrink-0"
        :src="bookCoverSrc"
        :alt="bookInfo.name.value"
        :to="bookInfo.productPageRoute.value"
        :is-vertical-center="true"
        @click="emit('click-cover', nftClassId)"
      />

      <div>
        <div
          class="laptop:text-lg font-semibold line-clamp-2"
          v-text="bookInfo.name.value"
        />
        <div class="mt-1 text-gray-900">
          <span
            class="mr-0.5 text-xs laptop:text-sm"
            v-text="currency"
          />
          <span
            class="max-laptop:text-sm"
            v-text="formattedPrice"
          />
        </div>
      </div>
    </div>
    <div
      class="col-span-2 text-center"
      v-text="quantity"
    />
    <div class="col-span-1">
      <UTooltip :text="$t('cart_item_remove_tooltip_text')">
        <UButton
          icon="i-material-symbols-delete-outline-rounded"
          variant="link"
          color="neutral"
          @click="emit('remove', nftClassId)"
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
  price: {
    type: Number,
    default: 0,
  },
  quantity: {
    type: Number,
    default: 1,
  },
})

const emit = defineEmits(['click-cover', 'remove'])

const nftStore = useNFTStore()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

const { t: $t } = useI18n()

useVisibility('lazyLoadTrigger', (visible) => {
  if (visible) {
    nftStore.lazyFetchNFTClassAggregatedMetadataById(props.nftClassId).catch(() => {
      console.warn(`Failed to fetch aggregated metadata for the NFT class [${props.nftClassId}]`)
    })
  }
})

const subtotalPrice = computed(() => props.price * props.quantity)
const { formatPrice } = useCurrency()
const formattedPrice = computed(() => formatPrice(subtotalPrice.value))
const currency = computed(() => subtotalPrice.value > 0 ? 'US' : '')
</script>
