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
        'relative',
        {
          'cursor-pointer': isClickable,
          'w-full': isShowPlaceholder || hasShadow || hasOverlay,
          'h-full': isShowPlaceholder,
        },
      ]"
      :to="props.to"
      @click="emit('click', $event)"
    >
      <div
        aria-hidden="true"
        :class="[
          'book-cover-edge',
          { 'book-cover-edge--shadow': hasShadow },
          ...layerBaseClass,
        ]"
      />
      <img
        ref="imgElement"
        :class="[
          coverClass,
          'relative',
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
          'bg-default',
          'pointer-events-none',
          isShowPlaceholder ? 'opacity-100' : 'opacity-0',
        ]"
      >
        <!-- Translucent tint on an opaque base, so the paper edge behind doesn't show through. -->
        <div
          :class="[
            'absolute',
            'inset-0',
            'bg-skeleton',
            BOOK_COVER_ROUNDED_CLASS,
            { 'animate-pulse': !hasLoaded },
          ]"
        />
        <UIcon
          :class="[
            'relative',
            'text-dimmed/50',
            hasError || !props.src ? 'opacity-100' : 'opacity-0',
            ...opacityTransitionClass,
          ]"
          name="i-material-symbols-book-2-outline-rounded"
          size="100"
        />
      </div>
      <div
        aria-hidden="true"
        :class="[
          'book-cover-finish',
          ...layerBaseClass,
        ]"
      />

      <div
        v-if="hasOverlay"
        :class="layerBaseClass"
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
// Near-square corners of a printed book; skeletons share it to keep the same shape.
export const BOOK_COVER_ROUNDED_CLASS = 'rounded-xs'
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
    BOOK_COVER_ROUNDED_CLASS,
    ...coverTransitionClass,
    { 'shadow-[0_1px_3px_0_rgb(0_0_0/0.22)]': props.hasShadow },
  ]
  if (isClickable.value) {
    classes.push(
      'group-hover:shadow-xl',
      ...coverHoverScaleClass,
    )
  }
  return classes
})

// Layers stacked on the cover, or its placeholder, follow its hover scale.
const layerBaseClass = computed(() => [
  'absolute',
  'inset-0',
  'pointer-events-none',
  BOOK_COVER_ROUNDED_CLASS,
  'transition-[scale]',
  ...transitionTimingClass,
  ...(isClickable.value ? coverHoverScaleClass : []),
])

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

<style scoped>
/*
 * Book style from the 3ook.com Graphic Design file, measured on a 388px cover.
 * Percentage margins resolve against the cover width, so the page block scales with the book.
 */
.book-cover-edge {
  margin: 1.75% -1.75% -0.44% 1.75%;
  background-image: linear-gradient(to bottom, #e3dfd6, #c2beb3);
}

.book-cover-edge--shadow {
  box-shadow:
    0 6px 12px rgb(26 31 28 / 16%),
    0 12px 24px rgb(26 31 28 / 12%);
}

/* Hinge (spine fold, 8.5% of the width), sheen, then a hairline inner shadow. */
.book-cover-finish {
  background-image:
    linear-gradient(to right, rgb(0 0 0 / 22%), rgb(255 255 255 / 18%) 35%, rgb(0 0 0 / 10%) 60%, transparent),
    linear-gradient(135deg, rgb(255 255 255 / 10%), transparent 45%, rgb(0 0 0 / 8%));
  background-repeat: no-repeat;
  background-size: 8.5% 100%, 100% 100%;
  box-shadow: inset 0 0 2px rgb(0 0 0 / 12%);
}
</style>
