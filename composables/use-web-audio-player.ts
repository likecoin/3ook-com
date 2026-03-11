const MAX_AUTO_RESUME_RETRIES = 3
const STUCK_DETECTION_TIMEOUT_MS = 5000

export function useWebAudioPlayer(): TTSAudioPlayer {
  const audioA = ref<HTMLAudioElement | null>(null)
  const audioB = ref<HTMLAudioElement | null>(null)

  let activeSlot: 'A' | 'B' = 'A'
  let swapping = false
  let dualMode = true

  let segments: TTSSegment[] = []
  let getAudioSrc: (segment: TTSSegment) => string = () => ''
  let currentIndex = 0
  let currentRate = 1.0
  let pausedInternally = false
  let autoResumeRetries = 0
  let autoResumeTimer: ReturnType<typeof setTimeout> | null = null
  let audible = false
  let active = false
  let errored = false
  let stuckTimer: ReturnType<typeof setTimeout> | null = null
  let stuckRetried = false

  const handlers: Partial<{ [K in keyof TTSAudioPlayerEvents]: TTSAudioPlayerEvents[K] }> = {}

  function on<K extends keyof TTSAudioPlayerEvents>(event: K, handler: TTSAudioPlayerEvents[K]) {
    handlers[event] = handler
  }

  function getActiveAudio(): HTMLAudioElement | null {
    return activeSlot === 'A' ? audioA.value : audioB.value
  }

  function getIdleAudio(): HTMLAudioElement | null {
    if (!dualMode) return null
    return activeSlot === 'A' ? audioB.value : audioA.value
  }

  function swapSlots() {
    activeSlot = activeSlot === 'A' ? 'B' : 'A'
  }

  function clearAutoResumeTimer() {
    if (autoResumeTimer) {
      clearTimeout(autoResumeTimer)
      autoResumeTimer = null
    }
  }

  function installHandlers(audio: HTMLAudioElement) {
    audio.onplay = () => {
      // Bug fix: if iOS resumes the idle element after lock screen, pause it
      // immediately to prevent two audio streams overlapping.
      if (audio !== getActiveAudio() || swapping) {
        audio.pause()
        return
      }
      errored = false
      autoResumeRetries = 0
    }

    audio.onplaying = () => {
      if (audio !== getActiveAudio() || swapping) return
      audible = true
      clearStuckTimer()
      handlers.play?.()
    }

    audio.onpause = () => {
      if (audio !== getActiveAudio() || swapping) return
      audible = false
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
        clearAutoResumeTimer()
        autoResumeTimer = setTimeout(() => {
          autoResumeTimer = null
          const current = getActiveAudio()
          if (!audible && current && !current.ended) {
            current.play()?.catch(handlePlayError)
          }
        }, 1000)
      }
    }

    audio.onended = () => {
      if (audio !== getActiveAudio() || swapping) return
      if (currentIndex >= segments.length - 1) {
        handlers.allEnded?.()
      }
      else {
        handlers.ended?.()
      }
    }

    audio.onstalled = () => {
      if (audio !== getActiveAudio() || swapping) return
      console.warn(`Audio playback stalled at ${currentRate}x`)
      if (audio.currentTime < 0.00001) {
        // Safari on iOS sometimes gets stuck at 0.000001 for rate > 1.0
        audio.playbackRate = 1.0
        if (active && !errored) {
          audio.play()?.catch(() => {})
        }
      }
    }

    audio.ontimeupdate = () => {
      if (audio !== getActiveAudio() || swapping) return
      if (audio.duration && Number.isFinite(audio.duration)) {
        handlers.positionState?.({ position: audio.currentTime, duration: audio.duration })
      }
    }

    audio.onerror = (e) => {
      if (audio !== getActiveAudio() || swapping) return
      errored = true
      const error = audio.error || e
      handlers.error?.(error)
    }
  }

  function ensureAudioPool() {
    if (audioA.value) return

    const a = new Audio()
    a.preload = 'auto'
    installHandlers(a)
    audioA.value = a

    const b = new Audio()
    b.preload = 'auto'
    installHandlers(b)
    audioB.value = b

    activeSlot = 'A'
  }

  function cleanupElement(audio: HTMLAudioElement | null) {
    if (!audio) return
    if (!audio.paused) {
      audio.pause()
    }
    audio.src = ''
    audio.removeAttribute('data-src')
    audio.load()
    audio.onplay = null
    audio.onplaying = null
    audio.onpause = null
    audio.onended = null
    audio.onerror = null
    audio.onstalled = null
    audio.ontimeupdate = null
  }

  function resetAudio() {
    swapping = true
    pausedInternally = true
    cleanupElement(audioA.value)
    cleanupElement(audioB.value)
    audioA.value = null
    audioB.value = null
    audible = false
    swapping = false
    pausedInternally = false
  }

  function preloadNextSegment() {
    const nextElement = segments[currentIndex + 1]
    if (!nextElement) return

    const src = getAudioSrc(nextElement)

    const idle = getIdleAudio()
    if (idle) {
      if (idle.getAttribute('data-src') !== src) {
        idle.setAttribute('data-src', src)
        idle.src = src
        idle.playbackRate = currentRate
        idle.defaultPlaybackRate = currentRate
        idle.load()
      }
    }
    else {
      // Single mode — warm the HTTP cache so the next segment loads faster
      fetch(src).catch(() => {})
    }
  }

  function handlePlayError(e: unknown, { clearStuck = false } = {}) {
    if (e instanceof DOMException && e.name === 'AbortError') return
    if (e instanceof DOMException && e.name === 'NotAllowedError') {
      errored = true
      if (clearStuck) clearStuckTimer()
      handlers.error?.('NotAllowedError')
      return
    }
    errored = true
    if (clearStuck) clearStuckTimer()
    console.warn('Play rejected:', e)
    handlers.error?.(e instanceof DOMException ? e.name : String(e))
  }

  function clearStuckTimer() {
    if (stuckTimer) {
      clearTimeout(stuckTimer)
      stuckTimer = null
    }
  }

  function playAtIndex(index: number) {
    active = true
    currentIndex = index
    errored = false
    stuckRetried = false
    audible = false
    clearStuckTimer()
    clearAutoResumeTimer()
    ensureAudioPool()

    const element = segments[index]
    if (!element) return

    const targetSrc = getAudioSrc(element)

    swapping = true
    const currentActive = getActiveAudio()
    if (currentActive && !currentActive.paused) {
      pausedInternally = true
      currentActive.pause()
      // onpause handler early-returns while swapping, so clear the flag manually
      pausedInternally = false
      currentActive.currentTime = 0
    }

    handlers.trackChanged?.(index)

    if (dualMode) {
      const idle = getIdleAudio()!
      const idleReady = idle.getAttribute('data-src') === targetSrc

      if (idleReady) {
        swapSlots()
        swapping = false
        const audio = getActiveAudio()!
        audio.playbackRate = currentRate
        audio.defaultPlaybackRate = currentRate
        audio.play()?.catch((e) => {
          if (e instanceof DOMException && e.name === 'NotAllowedError') {
            dualMode = false
            console.warn('Swap play() NotAllowedError — falling back to single element')
            swapSlots()
            clearStuckTimer()
            playSingleElement(targetSrc)
            armStuckTimer()
          }
          else {
            handlePlayError(e, { clearStuck: true })
          }
        })
      }
      else {
        // Idle element doesn't have the target src preloaded — no gapless benefit
        // from swapping; stay on the current (gesture-unlocked) element to avoid
        // NotAllowedError on iOS.
        swapping = false
        playSingleElement(targetSrc)
      }
    }
    else {
      swapping = false
      playSingleElement(targetSrc)
    }

    armStuckTimer()
    preloadNextSegment()
  }

  function playSingleElement(targetSrc: string) {
    const audio = getActiveAudio()!
    audio.setAttribute('data-src', targetSrc)
    audio.src = targetSrc
    audio.playbackRate = currentRate
    audio.defaultPlaybackRate = currentRate
    audio.load()
    audio.play()?.catch(e => handlePlayError(e, { clearStuck: true }))
  }

  // Stuck detection: if audio never becomes audible (onplaying) within timeout,
  // retry once then error.
  function armStuckTimer() {
    stuckTimer = setTimeout(() => {
      if (audible || !active || errored || stuckRetried) return
      console.warn(`Audio stuck — retrying playback`)
      stuckRetried = true
      const audio = getActiveAudio()
      if (!audio) return
      audio.load()
      audio.play()?.catch(e => handlePlayError(e, { clearStuck: true }))
      stuckTimer = setTimeout(() => {
        if (audible || !active || errored) return
        console.warn(`Audio stuck — retry failed after ${STUCK_DETECTION_TIMEOUT_MS}ms`)
        errored = true
        handlers.error?.(audio.error || 'STUCK_TIMEOUT')
      }, STUCK_DETECTION_TIMEOUT_MS)
    }, STUCK_DETECTION_TIMEOUT_MS)
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

    dualMode = true
    ensureAudioPool()

    playAtIndex(options.startIndex)
  }

  function resume(): boolean {
    const audio = getActiveAudio()
    if (!audio) return false
    active = true
    audio.play()?.catch((e) => {
      active = false
      clearAutoResumeTimer()
      handlePlayError(e)
    })
    return true
  }

  function pause() {
    active = false
    clearStuckTimer()
    clearAutoResumeTimer()
    audible = false
    const audio = getActiveAudio()
    if (audio) {
      if (!audio.paused) {
        pausedInternally = true
        audio.pause()
      }
      audio.currentTime = 0
    }
    handlers.pause?.()
  }

  function stop() {
    active = false
    clearStuckTimer()
    clearAutoResumeTimer()
    resetAudio()
  }

  function skipTo(index: number) {
    playAtIndex(index)
  }

  function setRate(rate: number) {
    currentRate = rate
    const act = getActiveAudio()
    if (act) {
      act.playbackRate = rate
      act.defaultPlaybackRate = rate
    }
    const idle = getIdleAudio()
    if (idle) {
      idle.playbackRate = rate
      idle.defaultPlaybackRate = rate
    }
  }

  function seek(time: number) {
    const audio = getActiveAudio()
    if (audio && Number.isFinite(audio.duration)) {
      audio.currentTime = Math.max(0, Math.min(time, audio.duration))
    }
  }

  function getPosition(): { position: number, duration: number } | null {
    const audio = getActiveAudio()
    if (!audio || !Number.isFinite(audio.duration)) return null
    return { position: audio.currentTime, duration: audio.duration }
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
