<template>
  <NuxtPage class="justify-center items-center w-full" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'reader',
  layoutTransition: {
    name: 'reader',
    mode: 'in-out',
  },
  middleware(to, from) {
    if (from.name === 'claim-page') {
      to.meta.layoutTransition = false
    }
  },
})

useHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const route = useRoute()
const getRouteQuery = useRouteQuery()
const localeRoute = useLocaleRoute()
const getRouteBaseName = useRouteBaseName()
const { loggedIn: hasLoggedIn } = useUserSession()
const { t: $t } = useI18n()

const nftClassId = computed(() => getRouteQuery('nft_class_id'))
const nftId = computed(() => getRouteQuery('nft_id'))
const isStandaloneMode = useStandaloneReaderMode()

if (!nftClassId.value && !isStandaloneMode.value) {
  await navigateTo(localeRoute({ name: 'shelf', query: route.query }))
}

// Uploaded books skip the NFT-only guards below — they're not on-chain, so
// there's no class to own, nothing to lowercase, and no nft_id to default.
const isUploadedBook = getRouteQuery('source') === 'upload'
if (isStandaloneMode.value) {
  // A local file preview has no book record to load or guard.
}
else if (isUploadedBook) {
  const uploadedBooksStore = useUploadedBooksStore()
  await uploadedBooksStore.fetchItems()
  const bookInfo = useUploadedBookInfo({ bookId: nftClassId })
  useHead({
    titleTemplate: () => {
      const bookName = bookInfo.name.value
      if (!bookName) return $t('app_title')
      return `${$t('reader_title', { name: bookName, author: '' })} | ${$t('app_title')}`
    },
  })
}
else {
  const bookInfo = useBookInfo({ nftClassId })
  const { checkOwnership } = useUserBookOwnership(nftClassId)
  const { isLikerPlus, isExpiredLikerPlus } = useSubscription()
  const queryCache = useQueryCache()
  const bookshelfStore = useBookshelfStore()
  const { notifyPlusReadingRemoved } = usePlusReadingRemovedNotice()

  const isPreviewRequested = getRouteQuery('preview') === '1'

  // Bouncing a rejected preview visitor to the shelf is a dead end — they own
  // no copy of the book — so send them back to the product page they came from.
  // Carry the query over: /middleware/query.global.ts doesn't run on the server,
  // so an SSR bounce would otherwise drop the utm/gclid params of an ad click.
  const rejectRoute = computed(() => {
    if (!isPreviewRequested) return localeRoute({ name: 'shelf', query: route.query })
    const { preview: _preview, ...query } = route.query
    return bookInfo.getProductPageRoute({
      llMedium: 'preview-reject',
      llSource: 'reader',
      query,
    })
  })

  if (nftClassId.value !== nftClassId.value.toLowerCase()) {
    await navigateTo(localeRoute({
      name: getRouteBaseName(route),
      query: {
        ...route.query,
        nft_class_id: nftClassId.value.toLowerCase(),
      },
    }), { replace: true })
  }

  // Owning, borrowing with Plus and previewing all require a session — the
  // preview file variant included — so a guest can never open the reader.
  if (!hasLoggedIn.value) {
    await navigateTo(rejectRoute.value)
  }
  else {
    // Resolve ownership and the Plus-reading flag together: a non-owner may still
    // borrow when the book allows Plus reading and they're an active Plus member
    // or the book has a free edition.
    const [isOwner] = await Promise.all([
      checkOwnership(),
      ensureNFTClassAggregatedMetadataThroughCache(queryCache, nftClassId.value)
        .catch(error => console.warn('Failed to fetch NFT metadata:', error)),
    ])
    const canBorrowFromMetadata = bookInfo.isPlusReadingEnabled.value
      && (isLikerPlus.value || bookInfo.hasFreeEdition.value)
    // Offline the metadata above can be gone (capped, version-bumped query
    // cache), so fall back to the persisted shelf under the accessibility the
    // shelf locks on. The server still gates fetches; a return purges the file.
    const normalizedNFTClassId = normalizeNFTClassId(nftClassId.value)
    const isPreLent = bookshelfStore.preLentNFTClassIds.includes(normalizedNFTClassId)
    const hasPlusReadingBorrow = bookshelfStore.plusReadingBookIds.includes(normalizedNFTClassId)
    const hasPersistedBorrow = isPreLent
      || (isLikerPlus.value && !isExpiredLikerPlus.value && hasPlusReadingBorrow)
    // A book never in the library reads as un-enabled too, so scope removal to a
    // borrow this reader holds; every other non-owner reject belongs on the shelf.
    // It also overrides the offline fallback, which would keep opening the file.
    const isRemovedFromLibrary = bookInfo.isPlusReadingRemoved.value && hasPlusReadingBorrow
    const isOffline = import.meta.client && !navigator.onLine
    const canBorrow = !isOwner && !isRemovedFromLibrary
      && (canBorrowFromMetadata || (isOffline && hasPersistedBorrow))
    if (isPreviewRequested && (isOwner || canBorrow)) {
      // Real access wins over preview: strip the param (and canonicalize nft_id
      // for owners, as the block below would) so the full file is fetched and a
      // borrow is registered/resumed as usual.
      const query = { ...route.query }
      delete query.preview
      if (!nftId.value && bookInfo.firstUserOwnedNFTId.value) {
        query.nft_id = bookInfo.firstUserOwnedNFTId.value
      }
      await navigateTo(localeRoute({
        name: getRouteBaseName(route),
        query,
      }), { replace: true })
    }
    const canPreview = isPreviewRequested && bookInfo.isPreviewEnabled.value
    if (!isOwner && !canBorrow && !canPreview) {
      // The shelf renders a removed book as locked and would bounce the reader
      // straight back here, so that reject goes to the product page instead.
      if (isRemovedFromLibrary) {
        await navigateTo(bookInfo.getProductPageRoute({
          ...notifyPlusReadingRemoved({ nftClassId: nftClassId.value, source: 'reader' }),
          query: route.query,
        }))
      }
      else {
        await navigateTo(rejectRoute.value)
      }
    }

    if (!isPreviewRequested && !nftId.value && bookInfo.firstUserOwnedNFTId.value) {
      await navigateTo(localeRoute({
        name: getRouteBaseName(route),
        query: {
          ...route.query,
          nft_id: bookInfo.firstUserOwnedNFTId.value,
        },
      }), { replace: true })
    }
  }

  useHead({
    titleTemplate: () => {
      const bookName = bookInfo.name.value
      const authorName = bookInfo.authorName.value
      if (!bookName || !authorName) {
        return $t('app_title')
      }
      return `${$t('reader_title', { name: bookName, author: authorName })} | ${$t('app_title')}`
    },
  })
}
</script>
