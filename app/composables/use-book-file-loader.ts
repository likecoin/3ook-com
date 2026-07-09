import { ORIGINAL_CONTENT_LENGTH_HEADER } from '~~/shared/utils/book-file'

// Abort a book-file load when no progress is made within this window. iOS
// WebKit wedges in-flight cross-origin fetches after the app is backgrounded,
// which would otherwise strand the reader on the loading bar forever.
const BOOK_FILE_STALL_TIMEOUT_MS = 30_000

// Strip query params before a book-file URL reaches analytics or error data: it
// carries a short-lived access token we must not ship to those destinations.
function getSanitizedBookFileURL(url: string) {
  try {
    const parsed = new URL(url, window.location.origin)
    return parsed.origin + parsed.pathname
  }
  catch {
    // Leave url as-is if it isn't a parseable URL.
    return url
  }
}

export default function () {
  const { t: $t } = useI18n()
  const { user } = useUserSession()
  const config = useRuntimeConfig()

  const loadingFilesize = ref(0)
  const loadedFilesize = ref(0)

  let activeController: AbortController | undefined

  // Lets the reader abort a wedged in-flight load (e.g. on foreground) so it can
  // retry without waiting out the stall timeout.
  function abortLoad() {
    activeController?.abort(new DOMException('Book file load aborted', 'AbortError'))
  }

  const loadingPercentage = computed(() => {
    if (loadingFilesize.value === 0) return 0
    return Math.floor((loadedFilesize.value / loadingFilesize.value) * 100)
  })

  const loadingFilesizeInMB = computed(() => {
    return (loadingFilesize.value / 1024 / 1024).toFixed(2)
  })

  const loadedFilesizeInMB = computed(() => {
    return (loadedFilesize.value / 1024 / 1024).toFixed(2)
  })

  const loadingLabel = computed(() => {
    if (loadingFilesize.value === 0) return ''
    return `${loadedFilesizeInMB.value} / ${loadingFilesizeInMB.value} MB (${loadingPercentage.value}%)`
  })

  async function loadFileAsBuffer(url: string, cacheKey?: string) {
    loadingFilesize.value = 0
    loadedFilesize.value = 0

    // Guard the whole load with an AbortController + stall watchdog. The
    // watchdog re-arms on every chunk, so a slow-but-progressing download is
    // never killed — only a stall (no progress within the timeout) aborts.
    const controller = new AbortController()
    activeController = controller
    const startedAt = Date.now()
    let didStall = false
    let isFromCache = false
    let watchdog: ReturnType<typeof setTimeout> | undefined
    const armWatchdog = () => {
      if (watchdog) clearTimeout(watchdog)
      watchdog = setTimeout(() => {
        didStall = true
        controller.abort(new DOMException('Book file load stalled', 'TimeoutError'))
      }, BOOK_FILE_STALL_TIMEOUT_MS)
    }
    const abortPromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener(
        'abort',
        () => reject(controller.signal.reason ?? new DOMException('Aborted', 'AbortError')),
        { once: true },
      )
    })
    // Without a cacheKey raceAbort() never runs, so abortPromise would reject
    // with no handler on abort. Keep a no-op catch so it can't surface as an
    // unhandled rejection; the real error is still thrown from the try block.
    abortPromise.catch(() => {})
    // Cache API calls take no AbortSignal, so race them against the abort to
    // avoid wedging there too on a backgrounded WebView.
    const raceAbort = <T>(promise: Promise<T>) => Promise.race([promise, abortPromise])

    try {
      armWatchdog()

      let res
      let cachePutPromise: Promise<boolean> | undefined
      const req = new Request(url)
      if (cacheKey && window.caches) {
        try {
          const cache = await raceAbort(caches.open(cacheKey))
          res = await raceAbort(cache.match(req))
          if (res) {
            isFromCache = true
            touchBookFileCacheEntry({
              cacheKeyPrefix: config.public.cacheKeyPrefix,
              cacheKey,
            })
          }
        }
        catch (error) {
          if (controller.signal.aborted) throw error
          console.error(error)
        }
      }
      if (!res) {
        res = await fetch(url, {
          signal: controller.signal,
          headers: {
            Authorization: user.value?.token
              ? `Bearer ${user.value.token}`
              : '',
          },
        })
        if (!res.ok) {
          const errorText = await res.text()
          throw createError({
            statusCode: res.status,
            message: errorText,
            data: {
              url: getSanitizedBookFileURL(url),
              description: $t('error_book_file_loading_failed'),
            },
          })
        }

        if (cacheKey && window.caches) {
          try {
            const cache = await raceAbort(caches.open(cacheKey))
            // Fire-and-forget: awaiting would drain the clone before our own
            // stream loop starts, forcing the tee to buffer the whole response.
            // On failure we delete the now-empty cache that caches.open() just
            // created; otherwise pruneBookFileCaches would treat it as live and
            // keep the index entry, inflating the LRU total.
            cachePutPromise = cache.put(req, res.clone())
              .then(() => true)
              .catch((error) => {
                console.error(error)
                // A foreground retry aborts this attempt mid-put; skip the
                // cleanup delete so it can't clobber the retry's write of the
                // same cacheKey.
                if (controller.signal.aborted) return false
                return caches.delete(cacheKey).catch(console.error).then(() => false)
              })
          }
          catch (error) {
            // An abort here (raceAbort losing) is a real load failure: surface
            // it to the outer handler instead of swallowing it, matching the
            // cache-read path.
            if (controller.signal.aborted) throw error
            console.error(error)
          }
        }
      }

      // Deferred until the body has finished streaming, since the byte size is
      // only known then. Prune reuses the index record() just wrote so opening
      // a book parses the localStorage index once, not twice.
      const registerCachedFile = (size: number) => {
        if (!cacheKey || !cachePutPromise) return
        void cachePutPromise.then((didCache) => {
          if (!didCache) return
          const index = recordBookFileCacheEntry({
            cacheKeyPrefix: config.public.cacheKeyPrefix,
            cacheKey,
            size,
          })
          void pruneBookFileCaches({
            cacheKeyPrefix: config.public.cacheKeyPrefix,
            keepCacheKey: cacheKey,
            index,
          })
        })
      }

      const streamReader = res?.body?.getReader()
      if (!streamReader) return

      const contentLength = Number(
        res?.headers?.get(ORIGINAL_CONTENT_LENGTH_HEADER)
        || res?.headers?.get('Content-Length'),
      )
      if (contentLength) {
        loadingFilesize.value = contentLength
      }

      // When content length is known, write directly into a pre-allocated buffer
      // to avoid holding both chunks[] and combinedChunks simultaneously (~2x peak memory).
      // Falls back to chunk accumulation if the header was unreliable.
      if (contentLength) {
        const buffer = new Uint8Array(contentLength)
        let offset = 0
        let overflow: Uint8Array[] | undefined
        while (true) {
          const { done, value } = await streamReader.read()
          if (done) break
          armWatchdog()
          if (!overflow && offset + value.length <= buffer.length) {
            buffer.set(value, offset)
          }
          else {
            if (!overflow) {
              overflow = [buffer.subarray(0, offset)]
            }
            overflow.push(value)
          }
          offset += value.length
          loadedFilesize.value = offset
        }
        if (!overflow) {
          registerCachedFile(offset)
          return offset < buffer.length
            ? buffer.buffer.slice(0, offset)
            : buffer.buffer
        }
        // Content-Length was wrong — combine overflow chunks
        const combined = new Uint8Array(offset)
        let pos = 0
        for (const chunk of overflow) {
          combined.set(chunk, pos)
          pos += chunk.length
        }
        registerCachedFile(offset)
        return combined.buffer
      }

      // Fallback: accumulate chunks when content length is unknown
      let receivedLength = 0
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await streamReader.read()
        if (done) break
        armWatchdog()
        chunks.push(value)
        receivedLength += value.length
        loadedFilesize.value = receivedLength
      }

      const combinedChunks = new Uint8Array(receivedLength)
      let position = 0
      for (const chunk of chunks) {
        combinedChunks.set(chunk, position)
        position += chunk.length
      }

      registerCachedFile(receivedLength)
      return combinedChunks.buffer
    }
    catch (error) {
      // A stall fired the watchdog: surface a recoverable error so the reader
      // shows its retry / back-to-shelf modal instead of spinning forever, and
      // record it for production triage.
      if (didStall) {
        const sanitizedURL = getSanitizedBookFileURL(url)
        useLogEvent('book_file_load_timeout', {
          url: sanitizedURL,
          from_cache: isFromCache,
          online: navigator.onLine,
          elapsed_ms: Date.now() - startedAt,
          loaded_bytes: loadedFilesize.value,
          total_bytes: loadingFilesize.value,
        })
        throw createError({
          statusCode: 504,
          message: 'Book file load timed out',
          data: {
            url: sanitizedURL,
            description: $t('error_book_file_loading_failed'),
            isTimeout: true,
          },
        })
      }
      // Manual abort (foreground retry) or any other error: rethrow as-is. The
      // reader's attempt guard ignores the superseded manual-abort rejection.
      throw error
    }
    finally {
      if (watchdog) clearTimeout(watchdog)
      if (activeController === controller) activeController = undefined
    }
  }

  return {
    loadingFilesize,
    loadedFilesize,

    loadingPercentage,
    loadingFilesizeInMB,
    loadedFilesizeInMB,
    loadingLabel,

    loadFileAsBuffer,
    abortLoad,
  }
}
