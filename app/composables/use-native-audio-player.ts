import { useEventListener } from '@vueuse/core'

export function useNativeAudioPlayer(isActive: Ref<boolean | undefined>): TTSAudioPlayer {
  const handlers: Partial<{ [K in keyof TTSAudioPlayerEvents]: TTSAudioPlayerEvents[K] }> = {}
  let loaded = false
  // The shell's own answer to what it can play with no network, read against
  // the playhead. Only shells advertising warmDepth send it.
  let warmedThrough = -1
  let currentIndex = 0
  // What the shell was asked to keep on disk, and whether it has started: it
  // arms its lookahead on the first segment boundary, so before that nothing is
  // downloaded. A request, not a fact — the pre-warmDepth fallback only.
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
      // Remote-control skips move the playhead too, so they carry the same
      // state as an engine-driven change: getWarmRunway would otherwise measure
      // against a playhead left behind at the last trackChanged.
      case 'trackChanged':
      case 'remoteNext':
      case 'remotePrevious':
        if (typeof detail.index === 'number') {
          hasCrossedSegment = true
          currentIndex = detail.index
          errored = false
          handlers.trackChanged?.(detail.index, detail.isResync ? { isResync: true } : undefined)
        }
        break
      case 'warmedThrough':
        if (typeof detail.index === 'number') {
          warmedThrough = detail.index
        }
        break
      case 'queueEnded':
        handlers.allEnded?.()
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
    currentIndex = options.startIndex
    warmedThrough = -1
    errored = false
    loaded = true
  }

  function getWarmRunway(): number {
    // Shells predating warmDepth report nothing back, so fall back to the depth
    // we asked them to keep, which their own cache kill switch can make
    // fiction. Optimistic, but the alternative halts on every dropout for
    // exactly the listeners whose runway the prefetch filled.
    if (!isNativeFeatureSupported('warmDepth')) {
      return hasCrossedSegment ? prefetchCount : 0
    }
    return getWarmRunwayFrom(warmedThrough, currentIndex)
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
    warmedThrough = -1
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
