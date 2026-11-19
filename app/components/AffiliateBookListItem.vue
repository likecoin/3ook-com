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

const queryCache = useQueryCache()
const { bookstoreInfo, productPageRoute } = useBookInfo({ nftClassId: toRef(props, 'nftClassId') })

const cover = computed(() => bookstoreInfo.value?.thumbnails?.small.url || '')

onMounted(() => {
  ensureNFTClassAggregatedMetadataThroughCache(queryCache, props.nftClassId).catch(() => { /* ignore */ })
})
</script>
