<template>
  <video
    v-if="campaignContent?.isVideo"
    :src="videoSrc"
    :poster="imageSrc"
    :controls="false"
    preload="metadata"
    playsinline
    muted
    autoplay
    loop
  />
  <img
    v-else-if="campaignContent?.isImage"
    class="object-contain object-center"
    :src="imageSrc"
    :alt="campaignContent?.title || ''"
  >
  <div
    v-else
    :aria-hidden="true"
  />
</template>

<script lang="ts" setup>
const VIDEOS_PATH = '/videos/subscription-campaigns'

const props = withDefaults(defineProps<{
  campaignId: string
  orientation?: 'landscape' | 'portrait'
}>(), {
  orientation: 'landscape',
})

const { campaignContent } = usePricingPageCampaign({ campaignId: props.campaignId })

const filepath = computed(() => {
  return `${VIDEOS_PATH}/${props.campaignId}-${props.orientation}`
})
const videoSrc = computed(() => `${filepath.value}.mp4`)
const imageSrc = computed(() => `${filepath.value}.jpg`)
</script>
