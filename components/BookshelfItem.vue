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
      :is-claimable="isClaimable"
      :is-staked="false"
      :has-shadow="true"
      @click="handleCoverClick"
    />

    <div class="mt-2 mb-1 w-full h-[24px]">
      <div
        v-if="progressPercentage > 0 && progressPercentage <= 100"
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
})

const emit = defineEmits(['visible', 'open', 'download', 'claim'])

const { t: $t } = useI18n()
const nftStore = useNFTStore()
const metadataStore = useMetadataStore()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const { downloadBookFile } = useBookDownload()
const getContentTypeLabel = useContentTypeLabel()
const { getResizedImageURL } = useImageResize()
const { checkOwnership } = useUserBookOwnership(props.nftClassId)
const toast = useToast()
const { errorModal } = useErrorHandler()

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

async function exportAnnotations() {
  useLogEvent('export_annotations', { nft_class_id: props.nftClassId })
  const loadingToast = toast.add({
    title: $t('bookshelf_export_annotations_loading'),
    duration: 0,
  })

  try {
    const data = await $fetch<Record<string, unknown> & { annotations: unknown[] }>(`/api/books/${props.nftClassId}/annotations/export`)

    if (!data.annotations?.length) {
      toast.add({
        title: $t('bookshelf_export_annotations_empty'),
        duration: 3000,
      })
      return
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/ld+json' })
    const filename = bookInfo.name.value?.replace(/[<>:"/\\|?*\n\r]+/g, '_').trim() || props.nftClassId
    saveAs(blob, `${filename}-annotations.json`)
    toast.add({
      title: $t('bookshelf_export_annotations_success'),
      duration: 3000,
    })
  }
  catch (error) {
    console.error(`Failed to export annotations for ${props.nftClassId}:`, error)
    toast.add({
      title: $t('bookshelf_export_annotations_failed'),
      color: 'error',
    })
  }
  finally {
    toast.remove(loadingToast.id)
  }
}
</script>
