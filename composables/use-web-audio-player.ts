const MAX_AUTO_RESUME_RETRIES = 3

export function useWebAudioPlayer(): TTSAudioPlayer {
  const activeAudio = ref<HTMLAudioElement | null>(null)
  const preloadAudio = ref<HTMLAudioElement | null>(null)

  let segments: TTSSegment[] = []
  let getAudioSrc: (segment: TTSSegment) => string = () => ''
  let currentIndex = 0
  let currentRate = 1.0
  let pausedInternally = false
  let autoResumeRetries = 0
  let playing = false
  let active = false
  let errored = false

  const handlers: Partial<{ [K in keyof TTSAudioPlayerEvents]: TTSAudioPlayerEvents[K] }> = {}

  function on<K extends keyof TTSAudioPlayerEvents>(event: K, handler: TTSAudioPlayerEvents[K]) {
    handlers[event] = handler
  }

  function resetAudio() {
    if (activeAudio.value) {
      if (!activeAudio.value.paused) {
        pausedInternally = true
        activeAudio.value.pause()
      }
      activeAudio.value.src = ''
      activeAudio.value.load()
      activeAudio.value.onplay = null
      activeAudio.value.onpause = null
      activeAudio.value.onended = null
      activeAudio.value.onerror = null
      activeAudio.value.onstalled = null
    }
    activeAudio.value = null
    if (preloadAudio.value) {
      preloadAudio.value.src = ''
      preloadAudio.value.load()
    }
    preloadAudio.value = null
  }

  // Ensure a single Audio element exists and has event handlers attached.
  // Reusing the same element across segments preserves the iOS audio session
  // and user-gesture association, allowing background playback to continue.
  function ensureAudio(): HTMLAudioElement {
    if (activeAudio.value) return activeAudio.value

    const audio = new Audio()
    activeAudio.value = audio
    audio.preload = 'auto'

    audio.onplay = () => {
      playing = true
      errored = false
      autoResumeRetries = 0
      handlers.play?.()
    }

    audio.onpause = () => {
      playing = false
      if (pausedInternally) {
        pausedInternally = false
        return
      }
      handlers.pause?.()
      // Don't auto-resume if the audio element is in an error state;
      // the error handler will skip to the next segment instead.
      if (errored) return
      // Unexpected pause (OS interruption: phone call, other app audio, etc.)
      // Attempt auto-resume after a short delay, with a retry limit
      if (active && autoResumeRetries < MAX_AUTO_RESUME_RETRIES) {
        autoResumeRetries += 1
        setTimeout(() => {
          if (!playing && activeAudio.value && !activeAudio.value.ended) {
            activeAudio.value.play()?.catch((e: unknown) => {
              if (e instanceof DOMException && e.name === 'NotAllowedError') {
                handlers.error?.('NotAllowedError')
              }
            })
          }
        }, 1000)
      }
    }

    audio.onended = () => {
      if (currentIndex >= segments.length - 1) {
        handlers.allEnded?.()
      }
      else {
        handlers.ended?.()
      }
    }

    audio.onstalled = () => {
      console.warn(`Audio playback stalled at ${currentRate}x`)
      if (audio.currentTime < 0.00001) {
        // Safari on iOS sometimes gets stuck at 0.000001 for rate > 1.0
        audio.playbackRate = 1.0
      }
    }

    audio.ontimeupdate = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        handlers.positionState?.({ position: audio.currentTime, duration: audio.duration })
      }
    }

    audio.onerror = (e) => {
      errored = true
      const error = audio.error || e
      handlers.error?.(error)
    }

    return audio
  }

  function preloadNextSegment() {
    const nextElement = segments[currentIndex + 1]
    if (!nextElement) return

    if (!preloadAudio.value) {
      preloadAudio.value = new Audio()
      preloadAudio.value.preload = 'auto'
    }

    const src = getAudioSrc(nextElement)
    if (preloadAudio.value.getAttribute('data-src') !== src) {
      preloadAudio.value.setAttribute('data-src', src)
      preloadAudio.value.src = src
      preloadAudio.value.load()
    }
  }

  function playAtIndex(index: number) {
    currentIndex = index
    errored = false

    const element = segments[index]
    if (!element) return

    // Stop current playback without destroying the audio element
    if (activeAudio.value && !activeAudio.value.paused) {
      pausedInternally = true
      activeAudio.value.pause()
      activeAudio.value.currentTime = 0
    }

    handlers.trackChanged?.(index)
    const audio = ensureAudio()
    audio.src = getAudioSrc(element)
    audio.playbackRate = currentRate
    audio.defaultPlaybackRate = currentRate
    audio.load()
    audio.play()?.catch((e: unknown) => {
      if (e instanceof DOMException && e.name === 'AbortError') return
      console.warn('Play rejected:', e)
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        playing = false
        handlers.error?.('NotAllowedError')
      }
    })

    preloadNextSegment()
  }

  function load(options: {
    segments: TTSSegment[]
    getAudioSrc: (segment: TTSSegment) => string
    startIndex: number
    rate: number
    metadata: { bookTitle: string, authorName: string, coverUrl: string }
  }) {
    active = true
    segments = options.segments
    getAudioSrc = options.getAudioSrc
    currentRate = options.rate
    playAtIndex(options.startIndex)
  }

  function resume(): boolean {
    if (!activeAudio.value) return false
    activeAudio.value.play()?.catch((e: unknown) => {
      if (e instanceof DOMException && e.name === 'AbortError') return
      console.warn('Resume play rejected:', e)
      if (e instanceof DOMException && e.name === 'NotAllowedError') {
        playing = false
        handlers.error?.('NotAllowedError')
      }
    })
    return true
  }

  function pause() {
    if (activeAudio.value) {
      if (!activeAudio.value.paused) {
        pausedInternally = true
        activeAudio.value.pause()
      }
      activeAudio.value.currentTime = 0
    }
    handlers.pause?.()
  }

  function stop() {
    active = false
    resetAudio()
  }

  function skipTo(index: number) {
    playAtIndex(index)
  }

  function setRate(rate: number) {
    currentRate = rate
    if (activeAudio.value) {
      activeAudio.value.playbackRate = rate
      activeAudio.value.defaultPlaybackRate = rate
    }
  }

  function seek(time: number) {
    if (activeAudio.value && Number.isFinite(activeAudio.value.duration)) {
      activeAudio.value.currentTime = Math.max(0, Math.min(time, activeAudio.value.duration))
    }
  }

  function getPosition(): { position: number, duration: number } | null {
    if (!activeAudio.value || !Number.isFinite(activeAudio.value.duration)) return null
    return { position: activeAudio.value.currentTime, duration: activeAudio.value.duration }
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
