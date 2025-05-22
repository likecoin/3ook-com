<template>
  <div class="relative flex items-end aspect-2/3">
    <img
      ref="imgElement"
      :class="[
        'bg-white',
        'border',
        'border-[#EBEBEB]',
        'rounded-lg',
        'group-hover:shadow-xl',
        'group-hover:scale-105',
        'transition-all',
        'duration-200',
        'ease-in-out',
        'origin-bottom',
        'cursor-pointer',
        hasLoaded && !hasError ? 'opacity-100' : 'opacity-0',
      ]"
      :src="props.src"
      :alt="props.alt"
      @load="handleImageLoad"
      @error="handleImageError"
      @click="emit('click', $event)"
    >
    <div
      v-if="!hasLoaded || hasError"
      :class="[
        'absolute',
        'flex',
        'justify-center',
        'items-center',
        'inset-0',
        'bg-[#E2E2E2]/60',
        'rounded-lg',
        { 'animate-pulse': !hasLoaded },
      ]"
    >
      <UIcon
        v-if="hasError"
        class="text-[#9B9B9B]/50"
        name="i-material-symbols-book-2-outline-rounded"
        size="100"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  src: {
    type: String,
    default: undefined,
  },
  alt: {
    type: String,
    default: '',
  },
})
const emit = defineEmits(['click'])

const hasLoaded = ref(false)
const hasError = ref(false)

const imgElement = useTemplateRef<HTMLImageElement>('imgElement')

onMounted(() => {
  if (imgElement.value?.complete) {
    hasLoaded.value = true
  }
})

watch(
  () => props.src,
  (newSrc) => {
    if (newSrc) {
      hasLoaded.value = false
      hasError.value = false
    }
  },
)

function handleImageLoad() {
  hasLoaded.value = true
}

function handleImageError() {
  hasLoaded.value = true
  hasError.value = true
}
</script>
