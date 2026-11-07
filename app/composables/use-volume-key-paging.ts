import { useEventListener, useStorage } from '@vueuse/core'

interface UseVolumeKeyPagingOptions {
  isActive?: MaybeRefOrGetter<boolean>
  onNextPage: () => void
  onPreviousPage: () => void
}

// The native shell intercepts the volume keys only while told to,
// so release them once paging stops applying: setting off, TTS playing or its player open, reader gone.
export function useVolumeKeyPaging({
  isActive = true,
  onNextPage,
  onPreviousPage,
}: UseVolumeKeyPagingOptions) {
  // Device-local like the volume keys themselves, and readable before login.
  const isEnabled = useStorage('reader_volume_key_paging', true)
  // Resolved on mount, not in setup: the server can't see `window`,
  // so the setting would render differently there than on the client.
  const isSupported = ref(false)
  const { isTTSPlaying } = useTTSPlayingState()
  const { isTTSQueryParam: isTTSPlayerOpen } = useTTSQueryParam()

  const shouldCaptureVolumeKeys = computed(() => (
    isSupported.value
    && isEnabled.value
    && !isTTSPlaying.value
    && !isTTSPlayerOpen.value
    && toValue(isActive)
  ))

  watch(shouldCaptureVolumeKeys, (enabled) => {
    postToNative({ type: 'setVolumeKeyPaging', enabled })
  })

  onMounted(() => {
    isSupported.value = isNativeWebView() && isNativeFeatureSupported('volumeKeyPaging')
  })

  onBeforeUnmount(() => {
    if (shouldCaptureVolumeKeys.value) {
      postToNative({ type: 'setVolumeKeyPaging', enabled: false })
    }
  })

  useEventListener('nativeBridgeEvent', (event) => {
    if (event.detail?.type !== 'volumeKeyPressed' || !shouldCaptureVolumeKeys.value) return
    if (event.detail.direction === 'down') onNextPage()
    else if (event.detail.direction === 'up') onPreviousPage()
  })

  return { isEnabled, isSupported }
}
