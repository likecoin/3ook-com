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
          'bg-theme-black/5',
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
          'bg-theme-black/10',
          'pointer-events-none',
          { 'animate-pulse': !hasLoaded },
        ]"
      >
        <UIcon
          :class="[
            'text-dimmed/50',
            hasError ? 'opacity-100' : 'opacity-0',
            'transition-opacity',
            'duration-300',
            'ease-out',
          ]"
          name="i-material-symbols-book-2-outline-rounded"
          size="100"
        />
      </div>

      <!-- Ribbon -->
      <div
        v-if="isShowRibbon"
        :class="[
          'pointer-events-none',
          'absolute',
          'inset-0',
          'overflow-hidden',
          ...(isClickable ? coverHoverScaleAnimationClass : []),
          'drop-shadow-md',
        ]"
      >
        <div
          :class="[
            'absolute',
            'top-0',
            'right-0',
            'translate-x-1/2',
            '-translate-y-1/2',
            'rotate-45',
            'origin-center',
            'w-full',
            'mt-6 laptop:mt-8',
            'mr-6 laptop:mr-8',
            'p-0.5 laptop:p-1',
            ribbonTextColorClass,
            'text-center',
            'text-[10px] laptop:text-sm',
            'font-bold',
            ribbonBgColorClass,
          ]"
          v-text="ribbonText"
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
  isStaked: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['click'])

const { t: $t } = useI18n()

const hasLoaded = ref(false)
const hasError = ref(false)

const imgElement = useTemplateRef<HTMLImageElement>('imgElement')

const borderRadiusClass = 'rounded-lg'

const isClickable = computed(() => !!props.to || !!getCurrentInstance()?.vnode.props?.onClick)

const isShowRibbon = computed(() => props.isClaimable || props.isStaked)
const ribbonText = computed(() => {
  if (props.isStaked) {
    return $t('staking_dashboard_staked')
  }
  if (props.isClaimable) {
    return $t('bookshelf_claimable_label')
  }
  return ''
})
const ribbonTextColorClass = computed(() => {
  if (props.isStaked) {
    return 'text-theme-cyan'
  }
  if (props.isClaimable) {
    return 'text-theme-black'
  }
  return ''
})
const ribbonBgColorClass = computed(() => {
  if (props.isStaked) {
    return 'bg-theme-black'
  }
  if (props.isClaimable) {
    return 'bg-theme-cyan'
  }
  return ''
})

const coverHoverScaleAnimationClass = [
  'group-hover:scale-105',
  'transition-all',
  'origin-bottom',
  'duration-300',
  'ease-out',
]

const coverClass = computed(() => {
  const classes = [
    'border-l',
    'border-t',
    'border-muted',
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
