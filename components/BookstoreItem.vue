<template>
  <li
    ref="lazyLoadTrigger"
    class="flex flex-col justify-end"
  >
    <BookCover
      :src="bookCoverSrc"
      :to="bookInfo.productPageRoute.value"
      :alt="bookName"
      @click="onBookCoverClick"
    />

    <div class="mt-2 h-[70px]">
      <div
        class="text-sm laptop:text-base text-[#1A1A1A] font-semibold line-clamp-2"
        v-text="bookName"
      />

      <div
        class="h-4 laptop:h-5 mt-0.5 text-xs laptop:text-sm text-[#9B9B9B] line-clamp-1"
        v-text="authorName"
      />
    </div>

    <div class="h-5 mt-3 text-sm text-[#1A1A1A] line-clamp-1">
      <span
        v-if="price > 0"
        class="text-xs mr-0.5"
        v-text="'US'"
      />
      <span v-text="formattedPrice" />
    </div>
  </li>
</template>

<script setup lang="ts">
const props = defineProps({
  nftClassId: {
    type: String,
    default: '',
  },
  bookName: {
    type: String,
    default: '',
  },
  bookCoverSrc: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['visible', 'open'])

const formatPrice = useFormatPrice()
const nftStore = useNFTStore()
const metadataStore = useMetadataStore()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value || props.bookCoverSrc, { size: 300 }))

const bookName = computed(() => bookInfo.name.value || props.bookName)
const authorName = computed(() => bookInfo.authorName.value)

const formattedPrice = computed(() => formatPrice(props.price))

useVisibility('lazyLoadTrigger', (visible) => {
  if (visible) {
    emit('visible', props.nftClassId)
    nftStore.lazyFetchNFTClassAggregatedMetadataById(props.nftClassId).catch(() => {
      console.warn(`Failed to fetch aggregated metadata for the NFT class [${props.nftClassId}]`)
    })
    if (bookInfo.nftClassOwnerWalletAddress.value) {
      metadataStore.lazyFetchLikerInfoByWalletAddress(bookInfo.nftClassOwnerWalletAddress.value).catch(() => {
        console.warn(`Failed to fetch Liker info of the wallet [${bookInfo.nftClassOwnerWalletAddress.value}] for the NFT class [${props.nftClassId}]`)
      })
    }
  }
})

function onBookCoverClick() {
  useLogEvent('select_item', {
    items: [{
      item_id: props.nftClassId,
      item_name: bookName.value,
      price: props.price,
      quantity: 1,
    }],
  })
}
</script>
