export default function () {
  const { t: $t } = useI18n()
  const { user } = useUserSession()

  const loadingFilesize = ref(0)
  const loadedFilesize = ref(0)

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

    let res
    const req = new Request(url)
    if (cacheKey && window.caches) {
      try {
        const cache = await caches.open(cacheKey)
        res = await cache.match(req)
      }
      catch (error) {
        console.error(error)
      }
    }
    if (!res) {
      res = await fetch(url, {
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
            url,
            description: $t('error_book_file_loading_failed'),
          },
        })
      }

      if (cacheKey && window.caches) {
        try {
          const cache = await caches.open(cacheKey)
          cache.put(req, res.clone())
        }
        catch (error) {
          console.error(error)
        }
      }
    }

    const streamReader = res?.body?.getReader()
    if (!streamReader) return

    const contentLength = Number(
      res?.headers?.get('X-Original-Content-Length')
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
      return combined.buffer
    }

    // Fallback: accumulate chunks when content length is unknown
    let receivedLength = 0
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await streamReader.read()
      if (done) break
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

    return combinedChunks.buffer
  }

  return {
    loadingFilesize,
    loadedFilesize,

    loadingPercentage,
    loadingFilesizeInMB,
    loadedFilesizeInMB,
    loadingLabel,

    loadFileAsBuffer,
  }
}
