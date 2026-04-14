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
    if (from.meta.name === 'claim-page') {
      to.meta.layoutTransition = false
    }
  },
})

const route = useRoute()
const getRouteQuery = useRouteQuery()
const localeRoute = useLocaleRoute()
const getRouteBaseName = useRouteBaseName()
const { t: $t } = useI18n()

const nftClassId = computed(() => getRouteQuery('nft_class_id'))
const nftId = computed(() => getRouteQuery('nft_id'))

if (!nftClassId.value) {
  await navigateTo(localeRoute({ name: 'shelf', query: route.query }))
}

// Uploaded books skip the NFT-only guards below — they're not on-chain, so
// there's no class to own, nothing to lowercase, and no nft_id to default.
const isUploadedBook = getRouteQuery('source') === 'upload'
if (isUploadedBook) {
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
  const { isOwner: isUserBookOwner, checkOwnership } = useUserBookOwnership(nftClassId)

  if (nftClassId.value !== nftClassId.value.toLowerCase()) {
    await navigateTo(localeRoute({
      name: getRouteBaseName(route),
      query: {
        ...route.query,
        nft_class_id: nftClassId.value.toLowerCase(),
      },
    }), { replace: true })
  }

  await checkOwnership()
  if (!isUserBookOwner.value) {
    await navigateTo(localeRoute({ name: 'shelf', query: route.query }))
  }

  if (!nftId.value && bookInfo.firstUserOwnedNFTId.value) {
    await navigateTo(localeRoute({
      name: getRouteBaseName(route),
      query: {
        ...route.query,
        nft_id: bookInfo.firstUserOwnedNFTId.value,
      },
    }), { replace: true })
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
