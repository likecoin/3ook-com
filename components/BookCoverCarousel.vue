<template>
  <div
    v-if="carouselItems.length > 1"
    class="relative"
  >
    <UCarousel
      v-slot="{ item }"
      :items="carouselItems"
      dots
      loop
      fade
      auto-height
      :autoplay="{ delay: 3000, stopOnInteraction: true }"
      :ui="{
        item: 'basis-full aspect-2/3 cursor-pointer',
        dots: 'relative bottom-0 gap-2 mt-2',
        dot: 'size-2 bg-accented data-[active]:bg-(--ui-text-muted)',
      }"
    >
      <div
        class="relative flex items-center justify-center w-full h-full"
        @click="openModal(item)"
      >
        <BookCover
          v-if="item.type === 'cover'"
          class="w-full h-full"
          :src="item.src"
          :alt="props.alt"
          :is-vertical-center="true"
        />

        <img
          v-else-if="item.type === 'image'"
          :src="item.src"
          :alt="props.alt"
          :class="[
            'max-w-full',
            'max-h-full',
            'object-contain',
            'rounded-lg',
            { 'shadow-[0_2px_4px_0_rgba(0,0,0,0.10)]': props.hasShadow },
          ]"
        >

        <BookCoverCarouselVideoThumbnail
          v-else-if="item.type === 'youtube' && item.videoId"
          :src="getYouTubeThumbnailUrl(item.videoId)"
          :alt="props.alt"
        />

        <BookCoverCarouselVideoThumbnail
          v-else-if="item.type === 'video'"
          :src="props.coverSrc"
          :alt="props.alt"
        />
      </div>
    </UCarousel>

    <UModal
      v-model:open="isModalOpen"
      :ui="{
        content: 'relative max-w-4xl bg-black',
      }"
      :close="{ color: 'neutral', variant: 'ghost', class: 'text-white' }"
    >
      <template #content>
        <img
          v-if="modalItem?.type === 'cover' || modalItem?.type === 'image'"
          :src="modalItem?.fullSrc || modalItem?.src"
          :alt="props.alt"
          class="w-full h-auto max-h-[80vh] object-contain"
        >

        <div
          v-else-if="modalItem?.type === 'youtube' && modalItem?.videoId"
          class="aspect-video"
        >
          <ScriptYouTubePlayer
            :video-id="modalItem.videoId"
            :player-vars="{ autoplay: 1, rel: 0, playsinline: 1 }"
            trigger="visible"
            class="w-full h-full"
          />
        </div>

        <video
          v-else-if="modalItem?.type === 'video'"
          :src="modalItem?.src"
          controls
          autoplay
          playsinline
          class="w-full max-h-[80vh]"
        />

        <template v-if="carouselItems.length > 1">
          <UButton
            icon="i-material-symbols-chevron-left"
            color="neutral"
            variant="ghost"
            aria-label="Previous"
            class="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer"
            @click="navigateModal(-1)"
          />
          <UButton
            icon="i-material-symbols-chevron-right"
            color="neutral"
            variant="ghost"
            aria-label="Next"
            class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 cursor-pointer"
            @click="navigateModal(1)"
          />
        </template>
      </template>
    </UModal>
  </div>

  <BookCover
    v-else
    :src="props.coverSrc"
    :alt="props.alt"
    :is-vertical-center="true"
    :has-shadow="props.hasShadow"
    @click="handleSingleCoverClick"
  />
</template>

<script setup lang="ts">
const IMAGE_THUMBNAIL_SIZE = 600
const IMAGE_FULL_SIZE = 1200

interface CarouselItem {
  type: 'cover' | 'image' | 'youtube' | 'video'
  src?: string
  fullSrc?: string
  videoId?: string
}

const { getResizedImageURL } = useImageResize()

const props = defineProps({
  coverSrc: {
    type: String,
    default: '',
  },
  alt: {
    type: String,
    default: '',
  },
  promotionalImages: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  promotionalVideos: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
  hasShadow: {
    type: Boolean,
    default: false,
  },
  nftClassId: {
    type: String,
    default: '',
  },
})

const isModalOpen = ref(false)
const modalItemIndex = ref(0)
const modalItem = computed(() => carouselItems.value[modalItemIndex.value] || null)

function openModal(item: CarouselItem) {
  const index = carouselItems.value.indexOf(item)
  modalItemIndex.value = index >= 0 ? index : 0
  isModalOpen.value = true
  useLogEvent('carousel_item_click', {
    nft_class_id: props.nftClassId,
    item_type: item.type,
    item_index: modalItemIndex.value,
  })
}

function navigateModal(direction: number) {
  const len = carouselItems.value.length
  modalItemIndex.value = (modalItemIndex.value + direction + len) % len
  const item = carouselItems.value[modalItemIndex.value]
  useLogEvent('carousel_modal_navigate', {
    nft_class_id: props.nftClassId,
    direction: direction > 0 ? 'next' : 'previous',
    item_type: item?.type,
    item_index: modalItemIndex.value,
  })
}

function handleSingleCoverClick() {
  useLogEvent('carousel_item_click', {
    nft_class_id: props.nftClassId,
    item_type: 'cover',
    item_index: 0,
  })
}

const carouselItems = computed<CarouselItem[]>(() => {
  const items: CarouselItem[] = []

  if (props.coverSrc) {
    items.push({
      type: 'cover',
      src: props.coverSrc,
    })
  }

  for (const imageUrl of props.promotionalImages) {
    if (imageUrl) {
      items.push({
        type: 'image',
        src: getResizedImageURL(imageUrl, { size: IMAGE_THUMBNAIL_SIZE }),
        fullSrc: getResizedImageURL(imageUrl, { size: IMAGE_FULL_SIZE }),
      })
    }
  }

  for (const videoUrl of props.promotionalVideos) {
    if (!videoUrl) continue

    if (isYouTubeUrl(videoUrl)) {
      const videoId = extractYouTubeVideoId(videoUrl)
      if (videoId) {
        items.push({
          type: 'youtube',
          videoId,
        })
      }
    }
    else {
      items.push({
        type: 'video',
        src: videoUrl,
      })
    }
  }

  return items
})
</script>
