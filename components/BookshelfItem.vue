<template>
  <li
    ref="lazyLoadTrigger"
    class="flex flex-col justify-end"
  >
    <BookCover
      :src="bookCoverSrc"
      :alt="bookInfo.name.value"
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
            <UCard :ui="{ header: 'text-center font-bold' }">
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
                :target="item.target"
                :rel="item.rel"
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
})

const emit = defineEmits(['visible', 'open'])

const { t: $t } = useI18n()
const accountStore = useAccountStore()
const nftStore = useNFTStore()
const metadataStore = useMetadataStore()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

const isLargerScreen = useMediaQuery('(min-width: 1024px)')

const menuItems = computed<DropdownMenuItem[]>(() => {
  const sortedContentURLs = [...bookInfo.contentURLs.value].sort(compareContentURL)

  const contentItems: DropdownMenuItem[] = sortedContentURLs.map((contentURL) => {
    let label: string
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

    return {
      label,
      icon: 'i-material-symbols-book-5-outline',
      onSelect: () => {
        openContentURL(contentURL)
      },
    }
  })

  contentItems.push({
    label: $t('bookshelf_view_book_product_page'),
    icon: 'i-material-symbols-visibility-outline',
    to: accountStore.isEVMMode ? bookInfo.productPageRoute.value : getLikerLandV2NFTClassPageURL(props.nftClassId),
    external: !accountStore.isEVMMode,
    target: accountStore.isEVMMode ? undefined : '_blank',
  })

  return contentItems
})

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

function handleCoverClick() {
  const contentURL = bookInfo.defaultContentURL.value
  if (contentURL) {
    openContentURL(contentURL)
  }
}
</script>
