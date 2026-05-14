<template>
  <li
    ref="lazyLoadTrigger"
    class="flex flex-col justify-end"
    :class="!props.isOwned ? 'opacity-50' : 'opacity-100'"
  >
    <BookCover
      :src="bookCoverSrc"
      :alt="bookInfo.name.value"
      :lazy="props.lazy"
      :ribbon-text="props.isClaimable ? $t('bookshelf_claimable_label') : ''"
      :has-shadow="true"
      @click="handleCoverClick"
    />

    <div class="mt-2 mb-1 w-full h-[24px]">
      <div
        v-if="props.stakedLike > 0"
        class="flex justify-between items-center gap-1 text-xs text-toned"
      >
        <span v-text="$t('staking_explore_total_staked')" />
        <BalanceLabel
          :value="props.stakedLike"
          :is-compact="true"
          :is-bold="false"
        />
      </div>
      <div
        v-else-if="progressPercentage > 0 && progressPercentage <= 100"
        class="w-full"
      >
        <div
          class="text-xs text-toned mb-0.5"
          v-text="`${progressPercentage}%`"
        />
        <div class="w-full h-1 rounded-full overflow-hidden ring-[0.5px] ring-inset ring-current text-highlighted">
          <div
            class="h-full bg-current transition-all duration-300"
            :style="{ width: `${progressPercentage}%` }"
          />
        </div>
      </div>
    </div>

    <div class="h-[70px]">
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
          v-model:open="isMobileMenuOpen"
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
                {{ bookInfo.name.value }}
              </template>
              <UButton
                v-for="item in menuItems"
                :key="item.label"
                class="cursor-pointer"
                :icon="item.icon"
                :label="item.label"
                :href="item.href"
                :to="item.to"
                :disabled="item.disabled"
                variant="link"
                color="neutral"
                size="xl"
                block
                :ui="{ base: 'justify-start' }"
                @click="(e) => {
                  isMobileMenuOpen = false
                  item.onSelect?.(e)
                }"
              />
            </UCard>
          </template>
        </UDrawer>
      </div>

      <div class="h-4 laptop:h-5 mt-0.5 truncate leading-none">
        <NuxtLink
          :to="bookInfo.getAuthorPageRoute({
            llMedium: 'author-link',
            llSource: 'bookshelf-item',
          })"
          :class="[
            'inline',
            'text-xs laptop:text-sm',
            'text-toned hover:text-theme-black',
            'hover:underline',
          ]"
        >{{ bookInfo.authorName }}</NuxtLink>
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
  isOwned: {
    type: Boolean,
    default: true,
  },
  progress: {
    type: Number,
    default: 0,
  },
  stakedLike: {
    type: Number,
    default: 0,
  },
  isArchived: {
    type: Boolean,
    default: false,
  },
  canArchive: {
    type: Boolean,
    default: false,
  },
  canEditReadingState: {
    type: Boolean,
    default: false,
  },
  isFinished: {
    type: Boolean,
    default: false,
  },
  isDidNotFinish: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'visible',
  'open',
  'download',
  'claim',
  'mark-as-reading',
  'mark-as-finished',
  'mark-as-did-not-finish',
  'archive',
  'unarchive',
])

const { t: $t } = useI18n()
const nftStore = useNFTStore()
const metadataStore = useMetadataStore()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const { downloadBookFile } = useBookDownload()
const getContentTypeLabel = useContentTypeLabel()
const { getResizedImageURL } = useImageResize()
const { checkOwnership } = useUserBookOwnership(props.nftClassId)
const { errorModal } = useErrorHandler()
const { exportAnnotations } = useExportAnnotations({
  bookId: computed(() => props.nftClassId),
  bookName: bookInfo.name,
})

const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

const progressPercentage = computed(() => Math.round(props.progress * 100))

const isDesktopScreen = useDesktopScreen()

const isMobileMenuOpen = ref(false)

const menuItems = computed<DropdownMenuItem[]>(() => {
  const items: DropdownMenuItem[] = []

  if (props.isClaimable) {
    items.push({
      label: $t('bookshelf_item_menu_claim_book'),
      icon: 'i-material-symbols-add-circle-outline-rounded',
      onSelect: claimBook,
    })
    // NOTE: No other actions are available for claimable items
    return items
  }

  // Reader items: only show if more than one content file
  if (props.isOwned && bookInfo.sortedContentURLs.value.length > 1) {
    bookInfo.sortedContentURLs.value.forEach((contentURL) => {
      items.push({
        label: getContentTypeLabel(contentURL.type),
        icon: 'i-material-symbols-book-5-outline-rounded',
        onSelect: () => openContentURL(contentURL),
      })
    })
  }

  // TTS
  if (props.isOwned) {
    if (bookInfo.isAudioHidden.value) {
      items.push({
        label: $t('bookshelf_item_menu_tts_disabled'),
        icon: 'i-material-symbols-graphic-eq-rounded',
        disabled: true,
      })
    }
    else {
      items.push({
        label: $t('bookshelf_item_menu_tts'),
        icon: 'i-material-symbols-graphic-eq-rounded',
        onSelect: openTTSPlayer,
      })
    }
  }

  // Staking
  items.push({
    label: $t('bookshelf_item_menu_staking'),
    icon: 'i-material-symbols-handshake-outline-rounded',
    to: bookInfo.getProductPageRoute({
      hash: '#staking-info',
    }),
  })

  // Reading state
  if (props.isOwned && props.canEditReadingState) {
    if (props.isFinished || props.isDidNotFinish) {
      items.push({
        label: $t('bookshelf_item_menu_mark_reading'),
        icon: 'i-material-symbols-book-5-outline-rounded',
        onSelect: () => emit('mark-as-reading', props.nftClassId),
      })
    }
    if (!props.isFinished) {
      items.push({
        label: $t('bookshelf_item_menu_mark_finished'),
        icon: 'i-material-symbols-check-circle-outline-rounded',
        onSelect: () => emit('mark-as-finished', props.nftClassId),
      })
    }
    if (!props.isDidNotFinish) {
      items.push({
        label: $t('bookshelf_item_menu_mark_dnf'),
        icon: 'i-material-symbols-cancel-outline-rounded',
        onSelect: () => emit('mark-as-did-not-finish', props.nftClassId),
      })
    }
  }

  // Archive / Unarchive
  if (props.isOwned && props.canArchive) {
    if (props.isArchived) {
      items.push({
        label: $t('bookshelf_item_menu_unarchive'),
        icon: 'i-material-symbols-unarchive-outline-rounded',
        onSelect: () => emit('unarchive', props.nftClassId),
      })
    }
    else {
      items.push({
        label: $t('bookshelf_item_menu_archive'),
        icon: 'i-material-symbols-archive-outline-rounded',
        onSelect: () => emit('archive', props.nftClassId),
      })
    }
  }

  // Book info
  items.push({
    label: $t('bookshelf_item_menu_view_book_info'),
    icon: 'i-material-symbols-info-outline-rounded',
    to: bookInfo.productPageRoute.value,
  })

  // Download
  if (props.isOwned) {
    if (bookInfo.isDownloadable.value) {
      bookInfo.sortedContentURLs.value.forEach((contentURL) => {
        items.push({
          label: $t('bookshelf_item_menu_download_file', { type: contentURL.type.toUpperCase() }),
          icon: 'i-material-symbols-download-rounded',
          onSelect: () =>
            downloadURL({
              name: contentURL.name,
              type: contentURL.type,
              fileIndex: contentURL.index,
            }),
        })
      })
    }
    else {
      items.push({
        label: $t('bookshelf_item_menu_download_disabled'),
        icon: 'i-material-symbols-download-rounded',
        disabled: true,
      })
    }
  }

  // Export annotations
  if (props.isOwned) {
    items.push({
      label: $t('bookshelf_item_menu_export_annotations'),
      icon: 'i-material-symbols-upload-rounded',
      onSelect: exportAnnotations,
    })
  }

  return items
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

function openContentURL(contentURL: ContentURL, { isTTS = false } = {}) {
  // TODO: UI to select specific NFT Id
  const nftId = props.nftIds?.[0]
  const readerRoute = bookInfo.getReaderRoute.value({ nftId, contentURL })
  if (!readerRoute) {
    errorModal.open({ description: $t('bookshelf_item_open_content_failed') })
    return
  }
  navigateTo(isTTS ? { ...readerRoute, query: { ...readerRoute.query, tts: '1' } } : readerRoute)
  emit('open', {
    nftClassId: props.nftClassId,
    type: contentURL.type,
    url: contentURL.url,
    name: contentURL.name,
    index: contentURL.index,
    isTTS,
  })
}

function openTTSPlayer() {
  const contentURL = bookInfo.defaultContentURL.value
  if (!contentURL) return
  openContentURL(contentURL, { isTTS: true })
}

async function downloadURL({ name, type, fileIndex }: { name: string, type: string, fileIndex?: number }) {
  await checkOwnership() // fetch ownership to populate firstUserOwnedNFTId
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
  if (props.isOwned && contentURL) {
    openContentURL(contentURL)
    return
  }

  navigateTo(bookInfo.getProductPageRoute({
    hash: '#staking-info',
  }))
}
</script>
