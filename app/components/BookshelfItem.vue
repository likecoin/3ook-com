<template>
  <li
    ref="lazyLoadTrigger"
    class="flex flex-col justify-end"
    :class="canRead ? 'opacity-100' : 'opacity-50'"
  >
    <BookCover
      :src="bookCoverSrc"
      :alt="bookInfo.name.value"
      :lazy="props.lazy"
      :ribbon-text="props.isClaimable ? $t('bookshelf_claimable_label') : ''"
      :has-shadow="true"
      @click="handleCoverClick"
    >
      <template
        v-if="props.isPlusReading"
        #overlay
      >
        <!-- Locked overlay when Plus has lapsed; the cover's own click routes to resubscribe. -->
        <div
          v-if="!props.isPlusReadingAccessible"
          class="absolute inset-0 flex items-center justify-center bg-theme-black/50 rounded-[inherit]"
          :aria-label="$t('bookshelf_plus_reading_locked_cta')"
        >
          <UIcon
            class="text-theme-white"
            name="i-material-symbols-lock-outline"
            size="32"
          />
        </div>

        <!-- Marks a borrowed (non-owned) book so owned books read as premium. -->
        <UBadge
          class="absolute top-2 left-2"
          icon="i-3ook-com-library-rounded"
          :title="$t('bookshelf_plus_reading_badge_label')"
          color="neutral"
          variant="solid"
          size="sm"
        />
      </template>
    </BookCover>

    <div class="mt-2 mb-1 w-full">
      <div
        v-if="props.stakedLike > 0"
        class="flex justify-between items-center flex-wrap gap-1 min-h-lh text-xs text-toned"
      >
        <span
          class="shrink-0"
          v-text="$t('staking_explore_total_staked')"
        />
        <BalanceLabel
          :value="props.stakedLike"
          :is-compact="true"
          :is-bold="false"
        />
      </div>
      <div
        v-else-if="progressPercentage > 0 && progressPercentage <= 100"
        class="w-full h-1 rounded-full overflow-hidden text-toned/50"
        role="progressbar"
        :aria-label="$t('bookshelf_item_reading_progress_label', { percentage: progressPercentage })"
        :aria-valuenow="progressPercentage"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          class="h-full bg-current rounded-full transition-all duration-300"
          :style="{ width: `${progressPercentage}%` }"
        />
      </div>
    </div>

    <div class="flex items-start gap-1 min-h-[2lh] text-sm laptop:text-base">
      <div
        class="text-highlighted font-semibold line-clamp-2 grow"
        v-text="bookInfo.name"
      />

      <DefineMenuButton>
        <UButton
          class="-mr-2 -mt-1"
          icon="i-material-symbols-more-vert"
          color="neutral"
          variant="link"
        />
      </DefineMenuButton>

      <UDropdownMenu
        v-if="isDesktopScreen"
        :items="dropdownItems"
        :modal="true"
        :ui="{ label: 'font-normal text-dimmed' }"
      >
        <MenuButton />
      </UDropdownMenu>
      <UDrawer
        v-else
        v-model:open="isMobileMenuOpen"
        :title="bookInfo.name.value"
        :handle="false"
        :ui="{
          content: 'pb-safe',
          title: 'text-center font-bold',
          body: '-mx-3',
        }"
      >
        <MenuButton />

        <template #body>
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
          <div
            v-if="totalTimeLabel"
            class="mt-1 pt-2 px-6 border-t border-default text-xs text-dimmed"
            v-text="totalTimeLabel"
          />
        </template>
      </UDrawer>
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
  // A borrowed (non-owned) Plus-reading book. Shows a badge; when Plus has
  // lapsed (isPlusReadingAccessible=false) it renders locked with a resub CTA.
  isPlusReading: {
    type: Boolean,
    default: false,
  },
  isPlusReadingAccessible: {
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
  // Read/TTS time totals are only available for the logged-in user's own shelf,
  // so the time header is gated on isMyBookshelf.
  isMyBookshelf: {
    type: Boolean,
    default: false,
  },
  totalReadingTimeMs: {
    type: Number,
    default: 0,
  },
  // The TTS prop uses a lowercase "Tts" so its kebab-case binding round-trips
  // (an uppercase "TTS" would not).
  totalTtsListeningTimeMs: {
    type: Number,
    default: 0,
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
  'return-plus-reading',
  'archive',
  'unarchive',
])

const { t: $t, locale } = useI18n()
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

const [DefineMenuButton, MenuButton] = createReusableTemplate()

const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

const progressPercentage = computed(() => Math.round(props.progress * 100))

// A book is readable if owned, or borrowed via Plus reading with active Plus.
const canRead = computed(() =>
  props.isOwned || (props.isPlusReading && props.isPlusReadingAccessible),
)

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
  if (canRead.value && bookInfo.sortedContentURLs.value.length > 1) {
    bookInfo.sortedContentURLs.value.forEach((contentURL) => {
      items.push({
        label: getContentTypeLabel(contentURL.type),
        icon: 'i-material-symbols-book-5-outline-rounded',
        onSelect: () => openContentURL(contentURL),
      })
    })
  }

  // TTS
  if (canRead.value) {
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

  // Staking (hidden for borrowed Plus-reading books)
  if (!props.isPlusReading) {
    items.push({
      label: $t('bookshelf_item_menu_staking'),
      icon: 'i-material-symbols-handshake-outline-rounded',
      to: bookInfo.getProductPageRoute({
        hash: '#staking-info',
      }),
    })
  }

  // Reading state (owned books)
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

  // Return (borrowed Plus-reading books): the single terminal action, replacing
  // finished/DNF/archive. Drops the book from the shelf; session-only, so it
  // stays available after Plus lapses for cleanup.
  if (props.isPlusReading && props.canEditReadingState) {
    items.push({
      label: $t('bookshelf_item_menu_plus_reading_return'),
      icon: 'i-3ook-com-library-outline-rounded',
      onSelect: () => emit('return-plus-reading', props.nftClassId),
    })
  }

  // Archive / Unarchive (owned books only)
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

  // Download (owned books only; borrowed Plus-reading books get no entry)
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

  // Export annotations (owned or borrowed — both can be annotated while reading)
  if (props.isOwned || props.isPlusReading) {
    items.push({
      label: $t('bookshelf_item_menu_export_annotations'),
      icon: 'i-material-symbols-upload-rounded',
      onSelect: exportAnnotations,
    })
  }

  return items
})

// Total time spent with the book (reading + TTS), shown as a passive caption at
// the foot of the menu. Empty when the total is 0 or off the user's own shelf.
const totalTimeLabel = computed(() => {
  if (!props.isMyBookshelf) return ''
  const duration = formatDuration(props.totalReadingTimeMs + props.totalTtsListeningTimeMs, locale.value)
  return duration ? $t('bookshelf_item_menu_total_time', { duration }) : ''
})

// Desktop dropdown groups: the time caption (a non-interactive label) sits below
// the actions, separated by the divider Nuxt UI renders between groups.
const dropdownItems = computed<DropdownMenuItem[][]>(() => {
  if (!totalTimeLabel.value) return [menuItems.value]
  return [
    menuItems.value,
    [{ label: totalTimeLabel.value, type: 'label' as const }],
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

const localeRoute = useLocaleRoute()

function handleCoverClick() {
  if (props.isClaimable) {
    claimBook()
    return
  }

  // Lapsed Plus on a borrowed book: route to the membership page to resubscribe.
  if (props.isPlusReading && !props.isPlusReadingAccessible) {
    useLogEvent('shelf_plus_reading_resub_click', { nft_class_id: props.nftClassId })
    navigateTo(localeRoute({
      name: 'member',
      query: {
        ll_medium: 'plus-reading-locked',
        ll_source: 'shelf',
      },
    }))
    return
  }

  const contentURL = bookInfo.defaultContentURL.value
  if (canRead.value && contentURL) {
    openContentURL(contentURL)
    return
  }

  navigateTo(bookInfo.getProductPageRoute({
    hash: '#staking-info',
  }))
}
</script>
