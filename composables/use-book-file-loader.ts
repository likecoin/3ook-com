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

    const contentLength = Number(res?.headers?.get('X-Original-Content-Length'))
    if (contentLength) {
      loadingFilesize.value = contentLength
    }

    let receivedLength = 0
    const chunks = []
    while (true) {
      const { done, value } = await streamReader.read()
      if (done) break
      chunks.push(value)
      receivedLength += value.length
      loadedFilesize.value = receivedLength
    }

    const combinedChunks = new Uint8Array(receivedLength)
    let position = 0
    chunks.forEach((chunk) => {
      combinedChunks.set(chunk, position)
      position += chunk.length
    })

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
