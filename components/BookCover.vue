<template>
  <div
    :class="[
      'flex',
      { 'aspect-2/3': !isVerticalCenter || isShowPlaceholder },
      isVerticalCenter ? 'items-center' : 'items-end',
    ]"
  >
    <component
      :is="props.to ? NuxtLink : 'div'"
      :class="[
        'group',
        {
          'cursor-pointer': isClickable,
          'relative': isShowPlaceholder || (hasShadow && hasLoaded) || isClaimable,
          'w-full h-full': isShowPlaceholder,
        },
      ]"
      :to="props.to"
      @click="emit('click', $event)"
    >
      <div
        v-if="hasShadow"
        :class="[
          'absolute',
          'inset-0',
          'bg-[#D3D3D3]',
          borderRadiusClass,
          'opacity-20',
          'brightness-50',
          'blur-xl',
          'scale-110',
          'origin-[top_center]',
          '-translate-x-[10px]',
          'pointer-events-none',
        ]"
        :style="{ backgroundImage: hasLoaded && !hasError ? `url(${props.src})` : '' }"
      />
      <img
        ref="imgElement"
        :class="[
          coverClass,
          { relative: hasShadow },
          'bg-white',
          !isShowPlaceholder ? 'opacity-100' : 'opacity-0',
          { 'blur-xl': !hasLoaded },
          { 'pointer-events-none': isShowPlaceholder },
        ]"
        :src="props.src"
        :alt="props.alt"
        :loading="props.lazy ? 'lazy' : 'eager'"
        @load="handleImageLoad"
        @error="handleImageError"
      >
      <div
        v-show="isShowPlaceholder"
        :class="[
          coverClass,
          'absolute',
          'flex',
          'justify-center',
          'items-center',
          'inset-0',
          'bg-[#E2E2E2]/60',
          'pointer-events-none',
          { 'animate-pulse': !hasLoaded },
        ]"
      >
        <UIcon
          :class="[
            'text-[#9B9B9B]/50',
            hasError ? 'opacity-100' : 'opacity-0',
            'transition-opacity',
            'duration-300',
            'ease-out',
          ]"
          name="i-material-symbols-book-2-outline-rounded"
          size="100"
        />
      </div>

      <div
        v-if="isClaimable"
        :class="[
          'pointer-events-none',
          'absolute',
          'inset-0',
          'overflow-hidden',
          ...(isClickable ? coverHoverScaleAnimationClass : []),
        ]"
      >
        <div
          :class="[
            'absolute',
            'top-0',
            'right-[-50%]',
            'translate-x-[-36px]',
            'translate-y-[18px]',
            'rotate-45',
            'origin-center',
            'w-full',
            'p-2',
            'text-white',
            'text-center',
            'text-sm',
            'font-bold',
            'bg-theme-500',
            'outline-4',
            'outline-[#50E3C2]',
            'shadow-2xl',
          ]"
          v-text="$t('bookshelf_claimable_label')"
        />
      </div>
    </component>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

import { NuxtLink } from '#components'

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
  isClaimable: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['click'])

const hasLoaded = ref(false)
const hasError = ref(false)

const imgElement = useTemplateRef<HTMLImageElement>('imgElement')

const borderRadiusClass = 'rounded-lg'

const isClickable = computed(() => !!props.to || !!getCurrentInstance()?.vnode.props?.onClick)

const coverHoverScaleAnimationClass = [
  'group-hover:scale-105',
  'transition-all',
  'origin-bottom',
  'duration-300',
  'ease-out',
]

const coverClass = computed(() => {
  const classes = [
    'border',
    'border-[#EBEBEB]',
    borderRadiusClass,
    { 'shadow-[0_2px_4px_0_rgba(0,0,0,0.10)]': props.hasShadow },
  ]
  if (isClickable.value) {
    classes.push(
      'group-hover:shadow-xl',
      ...coverHoverScaleAnimationClass,
    )
  }
  return classes
})

const isShowPlaceholder = computed(() => !props.src || !hasLoaded.value || hasError.value)

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
