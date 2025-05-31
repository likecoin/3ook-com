<template>
  <NuxtPage class="flex flex-col justify-center items-center grow w-full" />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'reader',
  layoutTransition: {
    name: 'reader',
    mode: 'in-out',
  },
})

const { t: $t } = useI18n()

const nftClassId = computed(() => getRouteQuery('nft_class_id'))
const bookInfo = useBookInfo({ nftClassId: nftClassId.value })

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
</script>
