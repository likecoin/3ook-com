<template>
  <NuxtLink
    v-if="bookstoreInfo"
    :to="productPageRoute"
    class="group flex items-center gap-3"
    @click="emit('navigate')"
  >
    <BookCover
      class="w-12 shrink-0 aspect-auto"
      :src="cover"
      :alt="bookstoreInfo.name"
      has-shadow
    />
    <span
      class="text-sm text-highlighted line-clamp-2 group-hover:text-primary"
      v-text="bookstoreInfo.name"
    />
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{ nftClassId: string }>()

const emit = defineEmits<{ navigate: [] }>()

const nftStore = useNFTStore()
const { getResizedNormalizedImageURL } = useImageResize()
const { bookstoreInfo, productPageRoute } = useBookInfo({ nftClassId: toRef(props, 'nftClassId') })

const cover = computed(() => {
  const url = bookstoreInfo.value?.thumbnailUrl
  return url ? getResizedNormalizedImageURL(url, { size: 300 }) : ''
})

onMounted(() => {
  nftStore.lazyFetchNFTClassAggregatedMetadataById(props.nftClassId).catch(() => { /* ignore */ })
})
</script>
