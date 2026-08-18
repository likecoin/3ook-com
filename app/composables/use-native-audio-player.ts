import { useEventListener } from '@vueuse/core'

export function useNativeAudioPlayer(isActive: Ref<boolean | undefined>): TTSAudioPlayer {
  const handlers: Partial<{ [K in keyof TTSAudioPlayerEvents]: TTSAudioPlayerEvents[K] }> = {}
  let loaded = false
  // What the shell was asked to keep on disk, and whether it has started: it
  // arms its lookahead on the first segment boundary, so before that nothing is
  // downloaded. The shell reports no depth back, so this is a request, not a fact.
  let prefetchCount = 1
  let hasCrossedSegment = false
  // The bridge carries no error state, so latch the shell's last error to keep
  // resume() honest; cleared wherever playback demonstrably recovered.
  let errored = false

  function on<K extends keyof TTSAudioPlayerEvents>(event: K, handler: TTSAudioPlayerEvents[K]) {
    handlers[event] = handler
  }

  // Listen for events dispatched by the native app (gated on isActive)
  useEventListener(window, 'nativeAudioEvent' as keyof WindowEventMap, ((e: CustomEvent) => {
    if (!isActive.value) return
    const detail = e.detail
    if (!detail?.type) return

    switch (detail.type) {
      case 'playbackState':
        if (detail.state === 'playing') {
          errored = false
          handlers.play?.()
        }
        else if (detail.state === 'buffering') {
          handlers.buffering?.()
        }
        else if (detail.state === 'paused' || detail.state === 'stopped') {
          handlers.pause?.()
        }
        break
      case 'ended':
        handlers.ended?.()
        break
      case 'trackChanged':
        if (typeof detail.index === 'number') {
          hasCrossedSegment = true
          errored = false
          handlers.trackChanged?.(detail.index, detail.isResync ? { isResync: true } : undefined)
        }
        break
      case 'queueEnded':
        handlers.allEnded?.()
        break
      case 'remoteNext':
      case 'remotePrevious':
        if (typeof detail.index === 'number') {
          handlers.trackChanged?.(detail.index)
        }
        break
      case 'error':
        errored = true
        handlers.error?.(detail.message || 'Native audio error')
        break
    }
  }) as EventListener)

  function load(options: Parameters<TTSAudioPlayer['load']>[0]) {
    const origin = window.location.origin
    const tracks = options.segments.map((segment, i) => ({
      index: i,
      url: new URL(options.getAudioSrc(segment), origin).href,
      title: segment.text.substring(0, 50),
    }))

    postToNative({
      type: 'load',
      tracks,
      startIndex: options.startIndex,
      rate: options.rate,
      metadata: options.metadata,
      prefetchCount: options.prefetchCount,
    })
    prefetchCount = options.prefetchCount ?? 1
    hasCrossedSegment = false
    errored = false
    loaded = true
  }

  // For an entitled listener this clears the offline gate on the first boundary,
  // leaving the network_error backstop to raise the modal.
  function getWarmRunway(): number {
    return hasCrossedSegment ? prefetchCount : 0
  }

  function resume(): boolean {
    if (!loaded || errored) return false
    postToNative({ type: 'resume' })
    return true
  }

  function pause() {
    postToNative({ type: 'pause' })
  }

  function stop() {
    postToNative({ type: 'stop' })
    loaded = false
  }

  function skipTo(index: number) {
    postToNative({ type: 'skipTo', index })
  }

  function setRate(rate: number) {
    postToNative({ type: 'setRate', rate })
  }

  function seek(_time: number) {
    // Native app handles seeking via its own media session
  }

  function getPosition() {
    return null
  }

  function wasInterruptedByBackground(): boolean {
    return false
  }

  function getCurrentURL(): string {
    // Native app owns track URLs internally; not exposed to the web layer
    return ''
  }

  return {
    load,
    resume,
    pause,
    stop,
    skipTo,
    setRate,
    seek,
    getPosition,
    wasInterruptedByBackground,
    getCurrentURL,
    getWarmRunway,
    on,
  }
}
