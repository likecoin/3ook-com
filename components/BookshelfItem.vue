<template>
  <li
    ref="lazyLoadTrigger"
    class="flex flex-col justify-end"
    :class="!props.isOwned && props.stakedAmount > 0 ? 'opacity-50' : 'opacity-100'"
  >
    <BookCover
      :src="bookCoverSrc"
      :alt="bookInfo.name.value"
      :lazy="props.lazy"
      :is-claimable="isClaimable"
      :is-staked="hasStakes"
      :has-shadow="true"
      @click="handleCoverClick"
    />

    <div class="mt-2 h-[70px]">
      <div class="flex items-start gap-1">
        <div
          class="text-sm laptop:text-base text-highlighted font-semibold line-clamp-2 grow"
          v-text="bookInfo.name"
        />
        <UDropdownMenu
          v-if="isDesktopScreen"
          :items="menuItems"
          :modal="true"
        >
          <UButton
            class="-mr-2 -mt-1"
            icon="i-material-symbols-more-vert"
            color="neutral"
            variant="link"
          />
        </UDropdownMenu>
        <UDrawer
          v-else
          :handle="false"
        >
          <UButton
            class="-mr-2 -mt-1"
            icon="i-material-symbols-more-vert"
            color="neutral"
            variant="link"
          />
          <template #content>
            <UCard
              class="pb-safe"
              :ui="{ header: 'text-center font-bold' }"
            >
              <template #header>
                {{ $t('bookshelf_more_menu_title') }}
              </template>
              <UButton
                v-for="item in menuItems"
                :key="item.label"
                class="cursor-pointer"
                :icon="item.icon"
                :label="item.label"
                :href="item.href"
                :to="item.to"
                variant="link"
                color="neutral"
                size="xl"
                block
                :ui="{ base: 'justify-start' }"
                @click="item.onSelect"
              />
            </UCard>
          </template>
        </UDrawer>
      </div>

      <NuxtLink
        :to="bookInfo.getAuthorPageRoute({
          llMedium: 'author-link',
          llSource: 'bookshelf-item',
        })"
        class="inline-block mt-0.5 text-xs laptop:text-sm text-toned hover:text-theme-black line-clamp-1 hover:underline"
      >{{ bookInfo.authorName }}</NuxtLink>

      <!-- Staking info section -->
      <div
        v-if="hasStakes"
        class="mt-3 space-y-1"
      >
        <div class="flex items-center justify-between text-toned text-sm">
          <span v-text="$t('staking_dashboard_staked')" />
          <div class="flex items-center gap-1">
            <span v-text="formattedStakedAmount" />
            <span>LIKE</span>
          </div>
        </div>

        <div
          v-if="formattedPendingRewards"
          class="flex items-center justify-between text-toned text-xs"
        >
          <span v-text="$t('staking_dashboard_rewards')" />
          <div class="flex items-center gap-1">
            <span v-text="formattedPendingRewards" />
            <span>LIKE</span>
          </div>
        </div>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const props = defineProps({
  nftClassId: {
    type: String,
    default: '',
  },
  nftIds: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  lazy: {
    type: Boolean,
    default: false,
  },
  isClaimable: {
    type: Boolean,
    default: false,
  },
  stakedAmount: {
    type: Number,
    default: 0,
  },
  pendingRewards: {
    type: Number,
    default: 0,
  },
  isOwned: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['visible', 'open', 'download', 'claim'])

const { t: $t } = useI18n()
const nftStore = useNFTStore()
const metadataStore = useMetadataStore()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const { downloadBookFile } = useBookDownload()
const getContentTypeLabel = useContentTypeLabel()
const { getResizedImageURL } = useImageResize()

const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

const isDesktopScreen = useDesktopScreen()

const formattedStakedAmount = computed(() => {
  if (props.stakedAmount === 0) return ''
  return props.stakedAmount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
})

const formattedPendingRewards = computed(() => {
  if (props.pendingRewards === 0) return ''
  return props.pendingRewards.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
})

const hasStakes = computed(() => props.stakedAmount > 0)

const menuItems = computed<DropdownMenuItem[]>(() => {
  const genericItems: DropdownMenuItem[] = []
  const readerItems: DropdownMenuItem[] = []
  const downloadItems: DropdownMenuItem[] = []

  if (props.isClaimable) {
    genericItems.push({
      label: $t('bookshelf_claim_book'),
      icon: 'i-material-symbols-add-circle-outline-rounded',
      onSelect: claimBook,
    })
  }
  else {
    bookInfo.sortedContentURLs.value.forEach((contentURL) => {
      const label = getContentTypeLabel(contentURL.type)

      readerItems.push({
        label,
        icon: 'i-material-symbols-book-5-outline',
        onSelect: () => openContentURL(contentURL),
      })

      if (bookInfo.isDownloadable.value) {
        downloadItems.push({
          label: $t('bookshelf_download_file', { type: contentURL.type.toUpperCase() }),
          icon: 'i-material-symbols-download-rounded',
          onSelect: () =>
            downloadURL({
              name: contentURL.name,
              type: contentURL.type,
              fileIndex: contentURL.index,
            }),
        })
      }
    })
  }

  genericItems.push({
    label: $t('bookshelf_view_book_product_page'),
    icon: 'i-material-symbols-visibility-outline',
    to: bookInfo.productPageRoute.value,
  })

  genericItems.push({
    label: $t('bookshelf_view_book_staking_page'),
    icon: 'i-material-symbols-visibility-outline',
    to: bookInfo.getProductPageRoute({
      hash: '#staking-info',
    }),
  })

  return [
    ...readerItems,
    ...downloadItems,
    ...genericItems,
  ]
})

if (!props.lazy) {
  callOnce(`BookshelfItem_${props.nftClassId}`, () => {
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

function openContentURL(contentURL: ContentURL) {
  // TODO: UI to select specific NFT Id
  const nftId = props.nftIds?.[0]
  const readerRoute = bookInfo.getReaderRoute.value({ nftId, contentURL })
  navigateTo(readerRoute)
  emit('open', {
    nftClassId: props.nftClassId,
    type: contentURL.type,
    url: contentURL.url,
    name: contentURL.name,
    index: contentURL.index,
  })
}

async function downloadURL({ name, type, fileIndex }: { name: string, type: string, fileIndex?: number }) {
  await downloadBookFile({
    nftClassId: props.nftClassId,
    nftId: props.nftIds?.[0] || bookInfo.firstUserOwnedNFTId.value,
    isCustomMessageEnabled: bookInfo.isCustomMessageEnabled.value,
    filename: name,
    fileIndex,
    type,
  })
  emit('download', {
    nftClassId: props.nftClassId,
    type,
  })
}

function claimBook() {
  emit('claim', props.nftClassId)
}

function handleCoverClick() {
  if (props.isClaimable) {
    claimBook()
    return
  }

  const contentURL = bookInfo.defaultContentURL.value
  if (contentURL) {
    openContentURL(contentURL)
  }
}
</script>
