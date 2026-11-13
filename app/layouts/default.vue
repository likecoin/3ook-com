<template>
  <div
    ref="containerRef"
    class="flex flex-col min-h-svh pb-(--intercom-launcher-offset)"
  >
    <!-- Pull to refresh indicator -->
    <div
      v-if="isPullToRefreshEnabled && (isPulling || isRefreshing)"
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
      class="flex flex-col grow"
      :style="contentStyle"
    >
      <slot />
    </div>

    <AppFooter v-if="isFooterVisible" />

    <AppTabBar v-show="isTabBarVisible" />
  </div>
</template>

<script setup lang="ts">
import { SNAP_BACK_DURATION } from '~~/shared/constants/pull-to-refresh'

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

const { isApp, isAndroid } = useAppDetection()

const localeRoute = useLocaleRoute()
const getRouteBaseNameString = useRouteBaseNameString()

function navigateToTab(name: string) {
  navigateTo(localeRoute({ name }))
}

// The app hides the store tab, so the shortcut stays hidden there too.
function handleStoreShortcut() {
  if (isApp.value) return
  navigateToTab('store')
}

const listingPageStates = {
  store: useStorePageState('store'),
  library: useStorePageState('library'),
}

// The shelf filters its own books on `/`;
// anywhere else lands on a search box opened via `?search=1`,
// the library's when the store is hidden (in the app) or the library is already open.
function handleSearchShortcut(event: KeyboardEvent) {
  const routeBaseName = getRouteBaseNameString()
  if (routeBaseName.startsWith('shelf')) return
  event.preventDefault()
  const name = isApp.value || routeBaseName.startsWith('library') ? 'library' : 'store'
  // Otherwise the listing restores its saved query on mount,
  // which swaps the header to search results and unmounts the box.
  listingPageStates[name].clear()
  navigateTo(localeRoute({ name, query: { search: '1' } }))
}

useKeyboardShortcuts({
  's': handleStoreShortcut,
  'S': handleStoreShortcut,
  'l': () => navigateToTab('library'),
  'L': () => navigateToTab('library'),
  'f': () => navigateToTab('shelf'),
  'F': () => navigateToTab('shelf'),
  'c': () => navigateToTab('cart'),
  'C': () => navigateToTab('cart'),
  '/': handleSearchShortcut,
})

// iOS app handles pull-to-refresh natively in RN WebView
const isPullToRefreshEnabled = computed(() => isApp.value && isAndroid.value)

const containerRef = ref<HTMLElement>()
const pullTarget = computed(() => isPullToRefreshEnabled.value ? containerRef.value : undefined)

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
  if (!isPullToRefreshEnabled.value) return {}
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
