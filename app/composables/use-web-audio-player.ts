const MAX_AUTO_RESUME_RETRIES = 3
// Ceiling on the lookahead, whatever the caller asks for. Matches the native
// shell's, so one shared depth means the same thing on both; downloads are
// sequential, so this bounds total work rather than concurrency.
const MAX_PREFETCH_COUNT = 120
// Generous: a cold segment blocks on full synthesis. Only there to stop one
// pathological request holding the whole runway behind it.
const WARM_TIMEOUT_MS = 30000
const STUCK_DETECTION_TIMEOUT_MS = 5000

export function useWebAudioPlayer(): TTSAudioPlayer {
  const audioA = ref<HTMLAudioElement | null>(null)
  const audioB = ref<HTMLAudioElement | null>(null)

  let activeSlot: 'A' | 'B' = 'A'
  let swapping = false
  let dualMode = true
  // iOS gesture-unlock is per-element: once an element has successfully played,
  // subsequent programmatic .play() calls on it work even while backgrounded.
  const slotUnlocked: Record<'A' | 'B', boolean> = { A: false, B: false }

  let segments: TTSSegment[] = []
  let getAudioSrc: Parameters<TTSAudioPlayer['load']>[0]['getAudioSrc'] = () => ''
  // Segments to pull into the service worker cache ahead of the playhead, and
  // how far that has already reached. 1 means only the idle element's N+1.
  let prefetchCount = 1
  let warmedThrough = -1
  // Playhead the mark was computed against, so a backward move is detectable.
  let warmBase = -1
  let warming = false
  // Held until a segment boundary is crossed, matching the native shell: a book
  // opened and abandoned would otherwise pull a whole window of audio nobody
  // reaches, forcing the synthesis of any part of it the server hasn't cached.
  let warmArmed = false
  let currentIndex = 0
  let currentRate = 1.0
  let pausedInternally = false
  let autoResumeRetries = 0
  let autoResumeTimer: ReturnType<typeof setTimeout> | null = null
  let audible = false
  let active = false
  let errored = false
  let backgroundInterrupted = false
  let stuckTimer: ReturnType<typeof setTimeout> | null = null
  let stuckRetried = false
  let rateWasForced = false

  const handlers: Partial<{ [K in keyof TTSAudioPlayerEvents]: TTSAudioPlayerEvents[K] }> = {}

  function on<K extends keyof TTSAudioPlayerEvents>(event: K, handler: TTSAudioPlayerEvents[K]) {
    handlers[event] = handler
  }

  function getIdleSlot(): 'A' | 'B' {
    return activeSlot === 'A' ? 'B' : 'A'
  }

  function getActiveAudio(): HTMLAudioElement | null {
    return activeSlot === 'A' ? audioA.value : audioB.value
  }

  function getIdleAudio(): HTMLAudioElement | null {
    if (!dualMode) return null
    return getIdleSlot() === 'A' ? audioA.value : audioB.value
  }

  function swapSlots() {
    activeSlot = getIdleSlot()
  }

  function clearAutoResumeTimer() {
    if (autoResumeTimer) {
      clearTimeout(autoResumeTimer)
      autoResumeTimer = null
    }
  }

  function installHandlers(audio: HTMLAudioElement, slot: 'A' | 'B') {
    audio.onplay = () => {
      slotUnlocked[slot] = true
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
      // Not only on track change: this is where warming resumes after a pause
      // or a stall, both of which stand the loop down.
      void runWarm()
      handlers.play?.()
    }

    audio.onwaiting = () => {
      if (audio !== getActiveAudio() || swapping) return
      handlers.buffering?.()
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
            current.play()?.catch((e) => {
              if (e instanceof DOMException && e.name === 'NotAllowedError') {
                active = false
                backgroundInterrupted = true
                return
              }
              handlePlayError(e)
            })
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
        rateWasForced = true
        audio.playbackRate = 1.0
        audio.defaultPlaybackRate = 1.0
        handlers.rateForced?.(1.0)
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

    slotUnlocked.A = false
    slotUnlocked.B = false

    const a = new Audio()
    a.preload = 'auto'
    installHandlers(a, 'A')
    audioA.value = a

    const b = new Audio()
    b.preload = 'auto'
    installHandlers(b, 'B')
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
    audio.onwaiting = null
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

    void runWarm()
  }

  // Pull segments beyond the idle element's N+1 into the service worker cache.
  // One at a time: a browser allows ~6 connections per origin, so firing the
  // whole window at once would queue behind itself and starve the segment playing.
  async function runWarm() {
    if (warming) return
    warming = true
    try {
      for (;;) {
        if (!active || prefetchCount <= 1 || !warmArmed) return
        // Backpressure, as on native. readyState rather than a flag of our own:
        // it falls below HAVE_FUTURE_DATA exactly while the player is starved.
        const audio = getActiveAudio()
        if (!audible || !audio || audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return

        const end = Math.min(currentIndex + prefetchCount, segments.length - 1)
        // One scalar can't record gaps, so after any backward move the mark may
        // claim a stretch that was never warmed — including the segments right
        // ahead of the playhead, the ones a dropout needs. Re-walk the window.
        if (currentIndex < warmBase || warmedThrough > end) warmedThrough = currentIndex + 1
        warmBase = currentIndex
        const index = Math.max(currentIndex + 2, warmedThrough + 1)
        const segment = index <= end ? segments[index] : undefined
        if (!segment) return // Window already warm.

        const base = currentIndex
        try {
          // Timeout because a cold segment blocks on full synthesis server-side,
          // which would otherwise stall the whole runway behind it.
          const response = await fetch(getAudioSrc(segment, { blocking: true }), {
            signal: AbortSignal.timeout(WARM_TIMEOUT_MS),
          })
          // fetch only rejects on network errors, so an expired signature or a
          // 5xx would otherwise mark a runway the cache never received.
          if (!response.ok) return
          // Drain rather than abandon, to release the connection. Not
          // body.cancel() — that aborts the stream the worker is still caching.
          await response.arrayBuffer()
        }
        catch {
          // Bad network; the next track change re-arms us.
          return
        }
        // load() and stop() clear warmBase, so a mark can't outlive the book it
        // was fetched for. A backward seek leaves the playhead behind the mark;
        // a forward one keeps it true, the index it counts being absolute.
        if (warmBase !== base) return
        if (currentIndex >= base) warmedThrough = index
      }
    }
    finally {
      warming = false
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
    backgroundInterrupted = false
    stuckRetried = false
    audible = false
    clearStuckTimer()
    clearAutoResumeTimer()

    if (rateWasForced) {
      rateWasForced = false
      handlers.rateForced?.(currentRate)
    }

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

    // Skip dual-element swap when backgrounded unless the target slot was
    // already gesture-unlocked by a prior successful play — iOS ties audio
    // session permissions to the element that has been played at least once.
    const canSwapWhenHidden = !document.hidden || slotUnlocked[getIdleSlot()]
    if (dualMode && canSwapWhenHidden) {
      const idle = getIdleAudio()!
      const idleReady = idle.getAttribute('data-src') === targetSrc
        && idle.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA

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

  function load(options: Parameters<TTSAudioPlayer['load']>[0]) {
    active = true
    segments = options.segments
    getAudioSrc = options.getAudioSrc
    currentRate = options.rate
    // Clamped here for the same reason the native shell clamps what web sends:
    // this side owns the connections it spends.
    prefetchCount = Math.min(Math.max(options.prefetchCount ?? 1, 1), MAX_PREFETCH_COUNT)
    warmedThrough = -1
    warmBase = -1
    warmArmed = false

    dualMode = true
    ensureAudioPool()

    playAtIndex(options.startIndex)
  }

  function resume(): boolean {
    const audio = getActiveAudio()
    // An errored element cannot resume — its source has to be reloaded — so
    // report failure and let the caller fall back to a full load.
    if (!audio || audio.error) return false
    active = true
    backgroundInterrupted = false
    audio.play()?.catch((e) => {
      active = false
      clearAutoResumeTimer()
      handlePlayError(e)
    })
    return true
  }

  function pause() {
    active = false
    backgroundInterrupted = false
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
    backgroundInterrupted = false
    rateWasForced = false
    warmedThrough = -1
    warmBase = -1
    warmArmed = false
    clearStuckTimer()
    clearAutoResumeTimer()
    resetAudio()
  }

  function wasInterruptedByBackground(): boolean {
    return backgroundInterrupted
  }

  function skipTo(index: number) {
    warmArmed = true
    playAtIndex(index)
  }

  function setRate(rate: number) {
    rateWasForced = false
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

  function getCurrentURL(): string {
    return getActiveAudio()?.currentSrc || ''
  }

  // The idle element's N+1 plus everything runWarm has drained into the service
  // worker cache, which `warmedThrough` tracks as an absolute segment index.
  function getWarmRunway(): number {
    return getWarmRunwayFrom(warmedThrough, currentIndex)
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
