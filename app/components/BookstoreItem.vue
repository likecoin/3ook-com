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
      :priority="props.priority"
      :has-shadow="true"
      @click="onBookCoverClick"
    />

    <div class="mt-2 h-[70px]">
      <div
        class="text-sm laptop:text-base text-highlighted font-semibold line-clamp-2"
        v-text="bookName"
      />

      <div class="h-4 laptop:h-5 mt-0.5 truncate leading-none">
        <NuxtLink
          :to="bookInfo.getAuthorPageRoute({
            llMedium: 'author-link',
            llSource: 'bookstore-item',
          })"
          :class="[
            'inline',
            'text-xs laptop:text-sm',
            'text-toned hover:text-theme-black',
            'hover:underline',
          ]"
        >{{ authorName }}</NuxtLink>
      </div>
    </div>

    <div class="flex items-center justify-between mt-3 h-5">
      <!-- Price info for store mode -->
      <div
        v-if="!isApp || price === 0"
        class="text-sm text-theme-black dark:text-highlighted"
      >
        <span
          v-if="formattedDiscountPrice"
          v-text="formattedDiscountPrice"
        />
        <span
          :class="{ 'text-xs text-toned ml-0.5 line-through': formattedDiscountPrice }"
          v-text="formattedPrice"
        />
      </div>
      <NuxtLink
        v-if="likeRank > 0"
        :to="stakingRoute"
        class="text-muted text-sm font-semibold"
      >
        #{{ likeRank }}
      </NuxtLink>
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
  priority: {
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
  likeRank: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['visible', 'open'])

const { formatPrice, formatDiscountedPrice } = useCurrency()
const nftStore = useNFTStore()
const metadataStore = useMetadataStore()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const { getResizedImageURL } = useImageResize()
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value || props.bookCoverSrc, { size: 300 }))
const { isLikerPlus, PLUS_BOOK_PURCHASE_DISCOUNT } = useSubscription()
const { isApp } = useAppDetection()

const productPageRoute = computed(() => {
  return bookInfo.getProductPageRoute({
    llMedium: props.llMedium || undefined,
    llSource: props.llSource || undefined,
  })
})
const stakingRoute = computed(() => {
  const route = productPageRoute.value
  if (route?.name) {
    return {
      ...route,
      hash: '#staking-info',
    }
  }
  return undefined
})

const bookName = computed(() => bookInfo.name.value || props.bookName)
const authorName = computed(() => bookInfo.authorName.value)

const price = computed(() => props.price || bookInfo.minPrice.value)
const formattedPrice = computed(() => formatPrice(price.value))

const formattedDiscountPrice = computed(() => {
  if (isLikerPlus.value && price.value > 0) {
    return formatDiscountedPrice(price.value, PLUS_BOOK_PURCHASE_DISCOUNT)
  }
  return null
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
