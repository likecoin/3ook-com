import { useEventListener } from '@vueuse/core'

export function useNativeAudioPlayer(isActive: Ref<boolean | undefined>): TTSAudioPlayer {
  const handlers: Partial<{ [K in keyof TTSAudioPlayerEvents]: TTSAudioPlayerEvents[K] }> = {}
  let loaded = false

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
          handlers.trackChanged?.(detail.index)
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
        handlers.error?.(detail.message || 'Native audio error')
        break
    }
  }) as EventListener)

  function load(options: {
    segments: TTSSegment[]
    getAudioSrc: (segment: TTSSegment) => string
    startIndex: number
    rate: number
    metadata: { bookTitle: string, authorName: string, coverUrl: string }
  }) {
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
    })
    loaded = true
  }

  function resume(): boolean {
    if (!loaded) return false
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

  return {
    load,
    resume,
    pause,
    stop,
    skipTo,
    setRate,
    seek,
    getPosition,
    on,
  }
}
