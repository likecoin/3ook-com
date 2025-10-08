<template>
  <li
    ref="lazyLoadTrigger"
    class="flex flex-col justify-end"
  >
    <BookCover
      :src="bookCoverSrc"
      :to="productPageRoute"
      :alt="bookName"
      :lazy="props.lazy"
      :has-shadow="true"
      @click="onBookCoverClick"
    />

    <div class="mt-2 h-[70px]">
      <div
        class="text-sm laptop:text-base text-highlighted font-semibold line-clamp-2"
        v-text="bookName"
      />

      <NuxtLink
        :to="bookInfo.getAuthorPageRoute({
          llMedium: 'author-link',
          llSource: 'bookstore-item',
        })"
        class="inline-block h-4 laptop:h-5 mt-0.5 text-xs laptop:text-sm text-dimmed line-clamp-1 hover:text-theme-black hover:underline"
      >{{ authorName }}</NuxtLink>
    </div>

    <div class="h-5 mt-3 text-sm text-theme-black">
      <span
        v-if="price > 0"
        class="mr-0.5"
      >US</span>
      <span
        v-if="formattedDiscountPrice"
        v-text="formattedDiscountPrice"
      />
      <span
        :class="{ 'text-xs text-dimmed ml-0.5 line-through': formattedDiscountPrice }"
        v-text="formattedPrice"
      />
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
  lazy: {
    type: Boolean,
    default: false,
  },
  llMedium: {
    type: String,
    default: '',
  },
  llSource: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['visible', 'open'])

const { formatPrice } = useCurrency()
const nftStore = useNFTStore()
const metadataStore = useMetadataStore()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const { getResizedImageURL } = useImageResize()
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value || props.bookCoverSrc, { size: 300 }))
const { getPlusDiscountPrice } = useSubscription()

const productPageRoute = computed(() => {
  return bookInfo.getProductPageRoute({
    llMedium: props.llMedium || undefined,
    llSource: props.llSource || undefined,
  })
})

const bookName = computed(() => bookInfo.name.value || props.bookName)
const authorName = computed(() => bookInfo.authorName.value)

const price = computed(() => props.price || bookInfo.minPrice.value)
const formattedPrice = computed(() => formatPrice(price.value))

const formattedDiscountPrice = computed(() => {
  const plusPrice = getPlusDiscountPrice(price.value)
  return plusPrice ? formatPrice(plusPrice) : null
})

if (!props.lazy) {
  callOnce(`BookstoreItem_${props.nftClassId}`, () => {
    emit('visible', props.nftClassId)
    fetchBookInfo()
  })
}
else {
  useVisibility('lazyLoadTrigger', (visible) => {
    if (visible) {
      emit('visible', props.nftClassId)
      fetchBookInfo()
    }
  })
}

function fetchBookInfo() {
  nftStore.lazyFetchNFTClassAggregatedMetadataById(props.nftClassId).catch(() => {
    console.warn(`Failed to fetch aggregated metadata for the NFT class [${props.nftClassId}]`)
  })
  if (bookInfo.nftClassOwnerWalletAddress.value) {
    metadataStore.lazyFetchLikerInfoByWalletAddress(bookInfo.nftClassOwnerWalletAddress.value).catch(() => {
      console.warn(`Failed to fetch Liker info of the wallet [${bookInfo.nftClassOwnerWalletAddress.value}] for the NFT class [${props.nftClassId}]`)
    })
  }
}

function onBookCoverClick() {
  useLogEvent('select_item', {
    items: [{
      item_id: props.nftClassId,
      item_name: bookName.value,
      price: price.value,
      quantity: 1,
    }],
  })
  emit('open', props.nftClassId)
}
</script>
