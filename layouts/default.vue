<template>
  <div
    ref="containerRef"
    class="flex flex-col min-h-svh pb-(--intercom-launcher-offset)"
  >
    <!-- Pull to refresh indicator -->
    <div
      v-if="isApp && (isPulling || isRefreshing)"
      class="fixed top-0 left-0 right-0 flex items-center justify-center transition-opacity z-50 pointer-events-none"
      :style="indicatorStyle"
    >
      <UIcon
        v-if="isRefreshing"
        class="text-muted animate-spin"
        name="i-material-symbols-refresh-rounded"
        :size="32"
        :style="{ animationDuration: '500ms' }"
      />
      <UIcon
        v-else
        class="text-muted"
        name="i-material-symbols-refresh-rounded"
        :size="32"
        :style="spinnerStyle"
      />
    </div>

    <div
      class="grow"
      :style="contentStyle"
    >
      <slot />
    </div>

    <AppFooter v-show="isFooterVisible" />

    <AppTabBar v-show="isTabBarVisible" />
  </div>
</template>

<script setup lang="ts">
import { SNAP_BACK_DURATION } from '~/constants/pull-to-refresh'

defineProps({
  isFooterVisible: {
    type: Boolean,
    default: false,
  },
  isTabBarVisible: {
    type: Boolean,
    default: true,
  },
})

const { isApp } = useAppDetection()

const containerRef = ref<HTMLElement>()
const pullTarget = computed(() => isApp.value ? containerRef.value : undefined)

const {
  isPulling,
  isRefreshing,
  pullDistance,
  pullProgress,
} = usePullToRefresh(pullTarget)

const isSnappingBack = ref(false)
let snapBackTimer: ReturnType<typeof setTimeout> | undefined

watch(pullDistance, (newVal, oldVal) => {
  if (oldVal > 0 && newVal === 0 && !isPulling.value) {
    isSnappingBack.value = true
    clearTimeout(snapBackTimer)
    snapBackTimer = setTimeout(() => {
      isSnappingBack.value = false
    }, SNAP_BACK_DURATION)
  }
})

onBeforeUnmount(() => {
  clearTimeout(snapBackTimer)
})

const contentStyle = computed(() => {
  if (!isApp.value) return {}
  if (pullDistance.value === 0 && !isSnappingBack.value) return {}
  return {
    transform: `translateY(${pullDistance.value}px)`,
    transition: isPulling.value ? 'none' : `transform ${SNAP_BACK_DURATION}ms ease-out`,
  }
})

const indicatorStyle = computed(() => ({
  height: `${pullDistance.value}px`,
  opacity: pullProgress.value,
}))

const spinnerStyle = computed(() => ({
  transform: `rotate(${pullProgress.value * 720}deg)`,
}))
</script>
