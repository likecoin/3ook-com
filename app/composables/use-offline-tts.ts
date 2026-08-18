// A cold segment blocks on full synthesis server-side, so a download needs a
// far longer ceiling than the player's lookahead does.
const DOWNLOAD_TIMEOUT_MS = 60 * 1000

// How long to wait before re-checking whether playback still needs the network.
const BACKPRESSURE_POLL_MS = 500

export interface TTSDownloadProgress {
  completed: number
  total: number
  bytes: number
}

/**
 * Which books can be listened to without a network, and the loop that puts them
 * there. Mirrors useOfflineBooks: the badge is derived from the live cache
 * rather than the index, so an entry the browser evicted stops promising
 * playback we can no longer deliver.
 */
export function useOfflineTTS() {
  const config = useRuntimeConfig()
  const cacheKeyPrefix = config.public.cacheKeyPrefix

  // shallowRef: the Set is replaced wholesale, never mutated, so deep
  // reactivity would track a key per download and discard it on each refresh.
  const offlinePinIds = shallowRef<Set<string>>(new Set())
  const isDownloading = ref(false)
  const downloadProgress = ref<TTSDownloadProgress | null>(null)

  /**
   * Only pins the user downloaded, and only while their audio survives. Takes an
   * already-walked live set when the caller has one, so a sweep followed by a
   * refresh doesn't enumerate the whole cache twice.
   */
  async function refreshOfflineTTS(live?: Set<string>) {
    if (!import.meta.client || !window.caches) return
    try {
      const livePinIds = live ?? await getLiveTTSPinIds()
      const index = readTTSPinIndex(cacheKeyPrefix)
      offlinePinIds.value = new Set(Object.keys(index).filter(pinId => livePinIds.has(pinId)))
    }
    catch (error) {
      console.error(error)
    }
  }

  /**
   * Fetch each segment so the service worker caches it, then register the result
   * as a pin. One at a time and `blocking`, exactly as the player's lookahead
   * does: parallel fetches would queue behind themselves, and an abandoned
   * stream makes the server drop its half-written cache object.
   *
   * `shouldPause` is the caller's backpressure — a download that ignored
   * playback would compete with the segments the playhead is waiting on.
   */
  async function downloadTTS({
    pinId,
    segments,
    getAudioSrc,
    signal,
    shouldPause,
  }: {
    pinId: string
    segments: TTSSegment[]
    getAudioSrc: (segment: TTSSegment, options?: { blocking?: boolean }) => string
    signal?: AbortSignal
    shouldPause?: () => boolean
  }): Promise<TTSDownloadProgress & { failed: number }> {
    if (!import.meta.client || !window.caches) {
      throw new Error('TTS download requires a browser cache')
    }
    // One at a time: two loops would interleave progress and race the pin record.
    // Checked against the module-scope registry, not this instance's ref, since
    // every useOfflineTTS() call has its own.
    if (isDownloading.value || getIsTTSPinInFlight(pinId)) {
      throw new Error('A TTS download is already running')
    }

    // Segments already on disk — from a cancelled run, or from ordinary
    // listening — are counted rather than refetched, so resuming costs one
    // cache walk instead of a second pass over the whole book. Built once:
    // every URL re-sanitizes and re-signs its segment text.
    const urls = segments.map(segment => getAudioSrc(segment, { blocking: true }))
    const cachedURLs = await getCachedTTSSegmentURLs(urls)

    const releasePin = markTTSPinInFlight(pinId)
    isDownloading.value = true
    let completed = 0
    let failed = 0
    let bytes = 0
    downloadProgress.value = { completed, total: segments.length, bytes }

    try {
      for (const url of urls) {
        if (signal?.aborted) break
        while (shouldPause?.() && !signal?.aborted) {
          await new Promise(resolve => setTimeout(resolve, BACKPRESSURE_POLL_MS))
        }
        if (signal?.aborted) break

        if (cachedURLs.has(url)) {
          completed++
          downloadProgress.value = { completed, total: segments.length, bytes }
          continue
        }

        try {
          // The fetch runs inside the wrapper, not around it: the drain is part
          // of what must hit the timeout, and a cancel mid-drain must abort the
          // request rather than wait it out.
          const byteLength = await withAbortTimeout(
            DOWNLOAD_TIMEOUT_MS,
            fetchSignal => fetchTTSSegmentIntoCache(url, fetchSignal),
            signal,
          )
          if (byteLength === undefined) {
            failed++
            continue
          }
          bytes += byteLength
          completed++
        }
        catch {
          // A user cancel rejects the in-flight fetch; that is not a failure.
          if (signal?.aborted) break
          failed++
        }
        downloadProgress.value = { completed, total: segments.length, bytes }
      }

      // Register whatever landed: a partial download still plays offline up to
      // where it reached, and the pin is what protects it from the sweep. Recorded
      // before releasing the in-flight mark, so no sweep can see it unprotected.
      if (completed) {
        const index = recordTTSPin({ cacheKeyPrefix, pinId, size: bytes })
        releasePin()
        const live = await pruneTTSAudioCache({ cacheKeyPrefix, keepPinId: pinId, index })
        await refreshOfflineTTS(live)
      }
      return { completed, total: segments.length, bytes, failed }
    }
    finally {
      releasePin()
      isDownloading.value = false
      downloadProgress.value = null
    }
  }

  async function removeOfflineTTS(pinIds: string[]) {
    const live = await removeTTSPins({ cacheKeyPrefix, pinIds })
    await refreshOfflineTTS(live)
  }

  /** Keep the cache under budget on an ordinary listen, not only after a download. */
  async function sweepTTSAudioCache(keepPinId?: string) {
    if (keepPinId) touchTTSPin({ cacheKeyPrefix, pinId: keepPinId })
    const live = await pruneTTSAudioCache({ cacheKeyPrefix, keepPinId })
    await refreshOfflineTTS(live)
  }

  return {
    offlinePinIds,
    isDownloading,
    downloadProgress,
    refreshOfflineTTS,
    downloadTTS,
    removeOfflineTTS,
    sweepTTSAudioCache,
  }
}
