<template>
  <li
    ref="lazyLoadTrigger"
    class="flex flex-col justify-end group"
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
        >
          <UButton
            class="-mr-1.5 -mt-0.5"
            icon="i-material-symbols-more-vert"
            size="sm"
            color="neutral"
            variant="link"
          />
        </UDropdownMenu>
        <UDrawer
          v-else
          :handle="false"
        >
          <UButton
            class="-mr-1.5 -mt-0.5"
            icon="i-material-symbols-more-vert"
            size="sm"
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
})

const emit = defineEmits(['visible', 'open'])

const { t: $t } = useI18n()
const nftStore = useNFTStore()
const metadataStore = useMetadataStore()
const bookInfo = useBookInfo({ nftClassId: props.nftClassId })
const bookCoverSrc = computed(() => getResizedImageURL(bookInfo.coverSrc.value, { size: 300 }))

const isLargerScreen = useMediaQuery('(min-width: 1024px)')

const menuItems = computed<DropdownMenuItem[]>(() => {
  return [
    ...bookInfo.contentURLs.value.map((contentURL) => {
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
    }),
    {
      label: $t('bookshelf_view_book_product_page'),
      icon: 'i-material-symbols-visibility-outline',
      href: getLikerLandV2NFTClassPageURL(props.nftClassId),
      target: '_blank',
    },
  ]
})

useVisibility('lazyLoadTrigger', (visible) => {
  if (visible) {
    emit('visible', props.nftClassId)
    nftStore.lazyFetchNFTClassAggregatedMetadataById(props.nftClassId).catch(() => {
      console.warn(`Failed to fetch aggregated metadata for the NFT class [${props.nftClassId}]`)
    })
    if (bookInfo.publisherWalletAddress.value) {
      metadataStore.lazyFetchLikerInfoByWalletAddress(bookInfo.publisherWalletAddress.value).catch(() => {
        console.warn(`Failed to fetch Liker info of the wallet [${bookInfo.publisherWalletAddress.value}] for the NFT class [${props.nftClassId}]`)
      })
    }
  }
})

function openContentURL(contentURL: { type?: string, url: string, name: string, index?: number }) {
  emit('open', {
    nftClassId: props.nftClassId,
    type: contentURL.type,
    url: contentURL.url,
    name: contentURL.name,
    index: contentURL.index,
  })
}

function handleCoverClick() {
  const contentURL = bookInfo.contentURLs.value[0]
  if (contentURL) {
    openContentURL(contentURL)
  }
}
</script>
