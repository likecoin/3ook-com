<template>
  <li
    ref="lazyLoadTrigger"
    class="flex flex-col justify-end"
  >
    <BookCover
      :src="bookCoverSrc"
      :alt="bookInfo.name.value"
      :lazy="props.lazy"
      @click="handleCoverClick"
    />

    <div class="mt-2 h-[70px]">
      <div class="flex items-start gap-1">
        <div
          class="text-sm laptop:text-base text-[#1A1A1A] font-semibold line-clamp-2 grow"
          v-text="bookInfo.name"
        />
        <UDropdownMenu
          v-if="isLargerScreen"
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

      <div
        class="mt-0.5 text-xs laptop:text-sm text-[#9B9B9B] line-clamp-1"
        v-text="bookInfo.authorName"
      />
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
})

const emit = defineEmits(['visible', 'open', 'download'])

const { t: $t } = useI18n()
const nftStore = useNFTStore()
const metadataStore = useMetadataStore()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const { downloadBookFile } = useBookDownload()

const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

const isLargerScreen = useMediaQuery('(min-width: 1024px)')

const menuItems = computed<DropdownMenuItem[]>(() => {
  const sortedContentURLs = [...bookInfo.contentURLs.value].sort(compareContentURL)
  const readerItems: DropdownMenuItem[] = []
  const downloadItems: DropdownMenuItem[] = []

  sortedContentURLs.forEach((contentURL) => {
    let label = ''
    switch (contentURL.type) {
      case 'epub':
        label = $t('bookshelf_open_in_epub')
        break
      case 'pdf':
        label = $t('bookshelf_open_in_pdf')
        break
      default:
        label = $t('bookshelf_open_in_type', { type: contentURL.type })
        break
    }

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

  const productInfoItem: DropdownMenuItem = {
    label: $t('bookshelf_view_book_product_page'),
    icon: 'i-material-symbols-visibility-outline',
    to: bookInfo.productPageRoute.value,
  }

  return [...readerItems, ...downloadItems, productInfoItem]
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

function handleCoverClick() {
  const contentURL = bookInfo.defaultContentURL.value
  if (contentURL) {
    openContentURL(contentURL)
  }
}
</script>
