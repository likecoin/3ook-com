import type { InitUploadedBookResponse, UploadedBookMeta, UploadedBooksQuota } from '~/shared/types/uploaded-book'
import { UPLOADED_BOOK_COVER_MIME_TYPE, UPLOADED_BOOK_MAX_COUNT } from '~/shared/utils/uploaded-book'

export interface UploadedBookItem extends UploadedBookMeta {
  lastOpenedTime: number
  progress: number
}

export const useUploadedBooksStore = defineStore('uploaded-books', () => {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const bookSettingsStore = useBookSettingsStore()

  const rawItems = ref<UploadedBookMeta[]>([])
  const quota = ref<UploadedBooksQuota>({ count: 0, totalSize: 0, maxCount: UPLOADED_BOOK_MAX_COUNT })
  const isFetching = ref(false)
  const hasFetched = ref(false)

  const items = computed<UploadedBookItem[]>(() => {
    return rawItems.value.map((book) => {
      const settings = bookSettingsStore.getSettings(book.id)
      return {
        ...book,
        lastOpenedTime: settings?.lastOpenedTime || 0,
        progress: settings?.progress || 0,
      }
    })
  })

  async function fetchItems({ force = false } = {}) {
    if (isFetching.value) return
    if (hasFetched.value && !force) return
    isFetching.value = true
    try {
      const data = await $fetch<{
        items: UploadedBookMeta[]
        quota: UploadedBooksQuota
      }>('/api/uploaded-books')
      rawItems.value = data.items
      quota.value = data.quota

      const bookIds = data.items.map(item => item.id)
      if (bookIds.length) {
        await bookSettingsStore.fetchBatchSettings(bookIds)
      }
    }
    catch (error) {
      console.error('Failed to fetch uploaded books:', error)
    }
    finally {
      isFetching.value = false
      hasFetched.value = true
    }
  }

  async function uploadBook(
    file: File,
    { name, cover }: { name: string, cover?: Blob },
  ): Promise<UploadedBookMeta> {
    const init = await $fetch<InitUploadedBookResponse>('/api/uploaded-books', {
      method: 'POST',
      body: {
        mimeType: file.type,
        fileSize: file.size,
        ...(cover && { coverSize: cover.size }),
      },
    })

    // Upload bytes directly to Google Cloud Storage, bypassing the server to
    // avoid OOMing Cloud Run on large files. The PUT must echo every header
    // the signed URL was minted with (content-type, content-length-range,
    // and the create-only generation precondition), or GCS returns 403.
    const mainUpload = fetch(init.uploadURL, {
      method: 'PUT',
      headers: {
        'content-type': init.mimeType,
        'x-goog-content-length-range': `0,${file.size}`,
        'x-goog-if-generation-match': '0',
      },
      body: file,
    })

    // Cover upload runs in parallel and is treated as best-effort: if it
    // fails — whether via a rejected fetch (network error) or a non-2xx
    // response — the book still gets created without a cover.
    const coverUpload = cover && init.coverUploadURL
      ? fetch(init.coverUploadURL, {
          method: 'PUT',
          headers: {
            'content-type': UPLOADED_BOOK_COVER_MIME_TYPE,
            'x-goog-content-length-range': `0,${cover.size}`,
            'x-goog-if-generation-match': '0',
          },
          body: cover,
        }).catch(() => undefined)
      : undefined

    const [mainResponse, coverResponse] = await Promise.all([
      mainUpload,
      coverUpload ?? Promise.resolve(undefined),
    ])
    if (!mainResponse.ok) {
      throw createError({
        statusCode: mainResponse.status,
        message: 'UPLOAD_FAILED',
      })
    }
    const coverUploaded = !!(coverResponse && coverResponse.ok)

    const book = await $fetch<UploadedBookMeta>(`/api/uploaded-books/${init.bookId}/finalize`, {
      method: 'POST',
      body: {
        contentType: init.contentType,
        name,
        hasCover: coverUploaded,
      },
    })

    rawItems.value.unshift(book)
    quota.value = {
      ...quota.value,
      count: quota.value.count + 1,
      totalSize: quota.value.totalSize + book.fileSize,
    }
    return book
  }

  async function deleteBook(bookId: string) {
    await $fetch(`/api/uploaded-books/${bookId}`, { method: 'DELETE' })
    const index = rawItems.value.findIndex(b => b.id === bookId)
    if (index !== -1) {
      const removed = rawItems.value.splice(index, 1)
      if (removed[0]) {
        quota.value = {
          ...quota.value,
          count: Math.max(0, quota.value.count - 1),
          totalSize: Math.max(0, quota.value.totalSize - removed[0].fileSize),
        }
      }
    }
  }

  function getBook(bookId: string): UploadedBookMeta | undefined {
    return rawItems.value.find(b => b.id === bookId)
  }

  function reset() {
    rawItems.value = []
    quota.value = { count: 0, totalSize: 0, maxCount: UPLOADED_BOOK_MAX_COUNT }
    isFetching.value = false
    hasFetched.value = false
  }

  watch(hasLoggedIn, (value, oldValue) => {
    if (oldValue && !value) {
      reset()
    }
  })

  return {
    items,
    rawItems,
    quota,
    isFetching,
    hasFetched,

    fetchItems,
    uploadBook,
    deleteBook,
    getBook,
    reset,
  }
})
