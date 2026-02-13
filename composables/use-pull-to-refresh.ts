import {
  MAX_PULL_DISTANCE,
  PREVENT_SCROLL_THRESHOLD,
  PULL_RESISTANCE,
  PULL_THRESHOLD,
  REFRESH_TIMEOUT,
} from '~/constants/pull-to-refresh'

export function usePullToRefresh(target: MaybeRef<HTMLElement | undefined>) {
  const isRefreshing = ref(false)
  const pullDistance = ref(0)
  const canPull = ref(false)

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

  const { isSwiping, lengthY } = useSwipe(target, {
    passive: false,
    threshold: 0,
    onSwipeStart(e: TouchEvent) {
      if (isRefreshing.value) return
      canPull.value = checkIsScrolledToTop(e.target)
    },
    onSwipe(e: TouchEvent) {
      if (!canPull.value || isRefreshing.value) return

      // lengthY is coordsStart.y - coordsEnd.y, so negative when pulling down
      const distance = -lengthY.value

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
    },
    async onSwipeEnd() {
      if (!canPull.value || isRefreshing.value) {
        canPull.value = false
        return
      }

      if (pullDistance.value >= PULL_THRESHOLD) {
        isRefreshing.value = true
        canPull.value = false
        // Hold indicator at the threshold position while refreshing
        pullDistance.value = PULL_THRESHOLD

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

      // useSwipe sets isSwiping=false after this callback returns,
      // which enables the CSS transition. Then on the next tick,
      // setting pullDistance to 0 triggers the animated snap-back.
      canPull.value = false
      await nextTick()
      pullDistance.value = 0
    },
  })

  const isPulling = computed(() => isSwiping.value && canPull.value)

  return {
    isPulling: readonly(isPulling),
    isRefreshing: readonly(isRefreshing),
    pullDistance: readonly(pullDistance),
    pullProgress: readonly(pullProgress),
  }
}
