import { useThrottleFn } from '@vueuse/core'

interface TTSMediaSessionOptions {
  isNativeBridge: Ref<boolean>
  effectivePlaybackRate: Ref<number>
  isTextToSpeechPlaying: Ref<boolean>
  bookName?: MaybeRefOrGetter<string>
  bookChapterName?: MaybeRefOrGetter<string>
  bookAuthorName?: MaybeRefOrGetter<string>
  bookCoverSrc?: MaybeRefOrGetter<string>
  player: Pick<TTSAudioPlayer, 'getPosition' | 'seek'>
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onPreviousTrack: () => void
  onNextTrack: () => void
}

// Media Session (lock screen / hardware keys) integration — web only; the
// native shell owns its own Now-Playing surface.
export function useTTSMediaSession(options: TTSMediaSessionOptions) {
  const {
    isNativeBridge,
    effectivePlaybackRate,
    isTextToSpeechPlaying,
    bookName,
    bookChapterName,
    bookAuthorName,
    bookCoverSrc,
    player,
  } = options

  function updatePositionState() {
    if (!('mediaSession' in navigator)) return
    const pos = player.getPosition()
    if (pos) {
      try {
        navigator.mediaSession.setPositionState({
          duration: pos.duration,
          playbackRate: effectivePlaybackRate.value,
          position: pos.position,
        })
      }
      catch {
        // Some browsers throw if duration is not finite
      }
    }
  }

  // The web audio engine fires 'positionState' from `ontimeupdate` up to
  // ~60x/sec. setPositionState() hits the iOS WebKit Now-Playing service on
  // every call, wasting CPU (and battery) to keep the lock-screen scrubber
  // accurate to the millisecond — ~1s granularity is plenty. The native audio
  // engine never emits 'positionState', so this throttle is a web/PWA-only path.
  const throttledUpdatePositionState = useThrottleFn(updatePositionState, 1000, true)

  function setupMediaSession() {
    if (isNativeBridge.value) return
    try {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: toValue(bookName),
          album: toValue(bookChapterName) || toValue(bookName),
          artist: toValue(bookAuthorName),
          artwork: toValue(bookCoverSrc)
            ? [
                {
                  src: toValue(bookCoverSrc) as string,
                },
              ]
            : undefined,
        })

        navigator.mediaSession.setActionHandler('play', () => {
          options.onPlay()
        })

        navigator.mediaSession.setActionHandler('pause', () => {
          options.onPause()
        })

        navigator.mediaSession.setActionHandler('previoustrack', () => {
          options.onPreviousTrack()
        })

        navigator.mediaSession.setActionHandler('nexttrack', () => {
          options.onNextTrack()
        })

        navigator.mediaSession.setActionHandler('stop', () => {
          options.onStop()
        })

        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const pos = player.getPosition()
          if (pos) {
            const offset = details.seekOffset || 10
            player.seek(pos.position - offset)
            updatePositionState()
          }
        })

        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const pos = player.getPosition()
          if (pos) {
            const offset = details.seekOffset || 10
            player.seek(pos.position + offset)
            updatePositionState()
          }
        })

        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime != null) {
            player.seek(details.seekTime)
            updatePositionState()
          }
        })
      }
    }
    catch (error) {
      console.error('Error setting up Media Session:', error)
    }
  }

  watch(isTextToSpeechPlaying, () => {
    if (!isNativeBridge.value && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isTextToSpeechPlaying.value ? 'playing' : 'paused'
    }
  })

  function clearMediaSessionPlaybackState() {
    if (!isNativeBridge.value && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none'
    }
  }

  return {
    updatePositionState,
    throttledUpdatePositionState,
    setupMediaSession,
    clearMediaSessionPlaybackState,
  }
}
