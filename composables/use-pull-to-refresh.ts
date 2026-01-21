import {
  MAX_PULL_DISTANCE,
  PREVENT_SCROLL_THRESHOLD,
  PULL_RESISTANCE,
  PULL_THRESHOLD,
  REFRESH_TIMEOUT,
} from '~/constants/pull-to-refresh'

export function usePullToRefresh() {
  const startY = ref(0)
  const currentY = ref(0)
  const isPulling = ref(false)
  const isRefreshing = ref(false)
  const pullDistance = ref(0)

  const pullProgress = computed(() => {
    return Math.min(pullDistance.value / PULL_THRESHOLD, 1)
  })

  function checkIsScrolledToTop(target: EventTarget | null): boolean {
    // First check window scroll position
    if (window.scrollY !== 0) return false

    // Check if touch target or any ancestor has scrollable overflow
    let element = target as HTMLElement | null
    while (element && element !== document.body) {
      const style = window.getComputedStyle(element)
      const isScrollable = style.overflowY === 'scroll' || style.overflowY === 'auto'

      if (isScrollable && element.scrollTop > 0) {
        return false
      }

      element = element.parentElement
    }

    return true
  }

  function handleTouchStart(e: TouchEvent) {
    if (checkIsScrolledToTop(e.target) && !isRefreshing.value && e.touches[0]) {
      startY.value = e.touches[0].clientY
      isPulling.value = true
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isPulling.value || isRefreshing.value || !e.touches[0]) return

    // Cancel pull if multi-touch detected (e.g., pinch-to-zoom)
    if (e.touches.length > 1) {
      resetPullState()
      return
    }

    currentY.value = e.touches[0].clientY
    const distance = currentY.value - startY.value

    if (distance > 0) {
      pullDistance.value = Math.min(distance * PULL_RESISTANCE, MAX_PULL_DISTANCE)

      // Prevent default scroll behavior only when actively pulling
      // NOTE: This requires passive set to false on touchmove listener, which may
      // impact scroll performance slightly but is necessary for pull-to-refresh
      if (pullDistance.value > PREVENT_SCROLL_THRESHOLD) {
        e.preventDefault()
      }
    }
    else {
      pullDistance.value = 0
    }
  }

  function resetPullState() {
    // Don't reset during refresh — the reload flow manages its own cleanup
    if (isRefreshing.value) return
    isPulling.value = false
    pullDistance.value = 0
    startY.value = 0
    currentY.value = 0
  }

  async function handleTouchEnd() {
    if (!isPulling.value || isRefreshing.value) return

    if (pullDistance.value >= PULL_THRESHOLD) {
      isRefreshing.value = true
      isPulling.value = false
      // Hold indicator at the threshold position while refreshing
      pullDistance.value = PULL_THRESHOLD
      startY.value = 0
      currentY.value = 0
      // Safety timeout to reset state if reload doesn't navigate away
      const refreshTimer = setTimeout(() => {
        isRefreshing.value = false
        pullDistance.value = 0
      }, REFRESH_TIMEOUT)

      // Add a small delay for animation
      await sleep(1000)

      // Attempt Nuxt app reload with fallback to full page reload
      try {
        reloadNuxtApp()
      }
      catch (error) {
        console.error('Failed to reload Nuxt app, falling back to full reload:', error)
        window.location.reload()
      }
      // Cleanup if reload didn't navigate away
      clearTimeout(refreshTimer)
      isRefreshing.value = false
      pullDistance.value = 0
      return
    }

    // Clear isPulling first so the CSS transition activates, then animate
    // pullDistance to 0 on the next frame so the browser can interpolate
    isPulling.value = false
    startY.value = 0
    currentY.value = 0
    await nextTick()
    pullDistance.value = 0
  }

  return {
    isPulling: readonly(isPulling),
    isRefreshing: readonly(isRefreshing),
    pullDistance: readonly(pullDistance),
    pullProgress: readonly(pullProgress),
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel: resetPullState,
  }
}
