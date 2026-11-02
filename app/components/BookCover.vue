<template>
  <div
    :class="[
      'flex',
      { 'aspect-2/3': isShowPlaceholder },
      isVerticalCenter ? 'items-center' : 'items-end',
    ]"
  >
    <component
      :is="props.to ? NuxtLink : 'div'"
      :class="[
        'group',
        {
          'cursor-pointer': isClickable,
          'relative': isShowPlaceholder || hasShadow || hasOverlay,
          'w-full': isShowPlaceholder || hasShadow || hasOverlay,
          'h-full': isShowPlaceholder,
        },
      ]"
      :to="props.to"
      @click="emit('click', $event)"
    >
      <img
        v-if="hasShadow && imageSrc && !hasError"
        :src="imageSrc"
        alt=""
        aria-hidden="true"
        decoding="async"
        :loading="props.lazy ? 'lazy' : 'eager'"
        :fetchpriority="props.priority ? 'high' : undefined"
        :class="[
          'absolute',
          'inset-0',
          'w-full',
          'h-full',
          'object-cover',
          props.roundedClass,
          hasLoaded ? 'opacity-20' : 'opacity-0',
          'brightness-50',
          'blur-xl',
          'scale-110',
          'origin-[top_center]',
          '-translate-x-[10px]',
          'pointer-events-none',
          ...opacityTransitionClass,
        ]"
      >
      <img
        ref="imgElement"
        :class="[
          coverClass,
          { relative: hasShadow },
          'bg-white dark:bg-black',
          !isShowPlaceholder ? 'opacity-100' : 'opacity-0',
          { 'blur-xl': !hasLoaded },
          { 'pointer-events-none': isShowPlaceholder },
        ]"
        :src="imageSrc"
        :alt="props.alt"
        width="200"
        height="300"
        decoding="async"
        :loading="props.lazy ? 'lazy' : 'eager'"
        :fetchpriority="props.priority ? 'high' : undefined"
        @load="handleImageLoad"
        @error="handleImageError"
      >
      <div
        :class="[
          coverClass,
          'absolute',
          'flex',
          'justify-center',
          'items-center',
          'inset-0',
          'bg-skeleton',
          'pointer-events-none',
          isShowPlaceholder ? 'opacity-100' : 'opacity-0',
          { 'animate-pulse': !hasLoaded },
        ]"
      >
        <UIcon
          :class="[
            'text-dimmed/50',
            hasError || !props.src ? 'opacity-100' : 'opacity-0',
            ...opacityTransitionClass,
          ]"
          name="i-material-symbols-book-2-outline-rounded"
          size="100"
        />
      </div>

      <div
        v-if="hasOverlay"
        :class="[
          'absolute',
          'inset-0',
          'pointer-events-none',
          props.roundedClass,
          ...(isClickable ? [...coverTransitionClass, ...coverHoverScaleClass] : []),
        ]"
      >
        <slot name="overlay" />
      </div>
    </component>
  </div>
</template>

<script lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import { NuxtLink } from '#components'

export const BOOK_COVER_MAX_RETRY_COUNT = 2
export const BOOK_COVER_RETRY_DELAY_MS = 1500
</script>

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
  to: {
    type: Object as PropType<RouteLocationRaw>,
    default: undefined,
  },
  isVerticalCenter: {
    type: Boolean,
    default: false,
  },
  hasShadow: {
    type: Boolean,
    default: false,
  },
  lazy: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: Boolean,
    default: false,
  },
  roundedClass: {
    type: String,
    default: 'rounded-lg',
  },
})
const emit = defineEmits(['click'])

const hasLoaded = ref(false)
const hasError = ref(false)
const retryCount = ref(0)
let retryTimer: ReturnType<typeof setTimeout> | undefined

const imgElement = useTemplateRef<HTMLImageElement>('imgElement')

const isClickable = computed(() => !!props.to || !!getCurrentInstance()?.vnode.props?.onClick)

const slots = useSlots()
const hasOverlay = computed(() => !!slots.overlay)

const transitionTimingClass = [
  'duration-300',
  'ease-out',
]

const coverTransitionClass = [
  'transition-[opacity,scale,box-shadow]',
  ...transitionTimingClass,
]

const opacityTransitionClass = [
  'transition-opacity',
  ...transitionTimingClass,
]

const coverHoverScaleClass = [
  'group-hover:scale-105',
  'origin-bottom',
]

const coverClass = computed(() => {
  const classes = [
    'w-full',
    'h-auto',
    'border-l',
    'border-t',
    'border-muted',
    props.roundedClass,
    ...coverTransitionClass,
    { 'shadow-[0_2px_4px_0_rgba(0,0,0,0.10)]': props.hasShadow },
  ]
  if (isClickable.value) {
    classes.push(
      'group-hover:shadow-xl',
      ...coverHoverScaleClass,
    )
  }
  return classes
})

// Cache-busting query makes the browser refetch instead of reusing the failed response.
function getRetryImageURL(src: string, attempt: number) {
  try {
    const url = new URL(src, window.location.href)
    if (!['http:', 'https:'].includes(url.protocol)) return undefined
    url.searchParams.set('retry', String(attempt))
    return url.toString()
  }
  catch {
    return undefined
  }
}

const imageSrc = computed(() => {
  if (!props.src || !retryCount.value) return props.src
  return getRetryImageURL(props.src, retryCount.value) ?? props.src
})

const isShowPlaceholder = computed(() => !props.src || !hasLoaded.value || hasError.value)

onMounted(() => {
  if (imgElement.value?.complete) {
    hasLoaded.value = true
  }
})

onBeforeUnmount(() => {
  clearTimeout(retryTimer)
})

watch(
  () => props.src,
  (newSrc) => {
    clearTimeout(retryTimer)
    retryCount.value = 0
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
  const nextAttempt = retryCount.value + 1
  if (
    props.src
    && nextAttempt <= BOOK_COVER_MAX_RETRY_COUNT
    && getRetryImageURL(props.src, nextAttempt)
  ) {
    retryTimer = setTimeout(() => {
      retryCount.value = nextAttempt
    }, BOOK_COVER_RETRY_DELAY_MS)
    return
  }
  hasLoaded.value = true
  hasError.value = true
}
</script>
