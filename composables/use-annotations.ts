import { FetchError } from 'ofetch'

export default function useAnnotations(params: {
  nftClassId: Ref<string> | ComputedRef<string> | string
}) {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const nftClassId = computed(() => toValue(params.nftClassId))

  const annotations = ref<Annotation[]>([])
  const isLoading = ref(false)
  const hasFetched = ref(false)
  const fetchPromise = ref<Promise<void> | null>(null)

  const highlights = computed(() => annotations.value.filter(a => a.type === 'highlight'))
  const bookmarks = computed(() => annotations.value.filter(a => a.type === 'bookmark'))

  async function fetchAnnotations(): Promise<void> {
    if (!hasLoggedIn.value || !nftClassId.value) {
      return
    }

    if (fetchPromise.value) {
      return await fetchPromise.value
    }

    isLoading.value = true
    fetchPromise.value = apiFetch<{ annotations: Annotation[] }>(`/books/${nftClassId.value}/annotations`)
      .then((response) => {
        annotations.value = response.annotations
        hasFetched.value = true
      })
      .catch((error) => {
        console.warn(`Failed to fetch annotations for ${nftClassId.value}:`, error)
      })
      .finally(() => {
        isLoading.value = false
        fetchPromise.value = null
      })

    return fetchPromise.value
  }

  function createAnnotation(data: AnnotationCreateData): Annotation {
    const now = Date.now()
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      ...data,
      chapterTitle: data.chapterTitle || '',
      createdAt: now,
      updatedAt: now,
    }
    annotations.value = [...annotations.value, annotation]
    return annotation
  }

  function matchesCreateData(a: Annotation, data: AnnotationCreateData): boolean {
    if (a.type !== data.type) return false
    if (data.type === 'bookmark') {
      if (data.cfi !== undefined) return a.cfi === data.cfi
      if (data.page !== undefined) return a.page === data.page
      return false
    }
    return a.cfi === data.cfi
  }

  async function saveAnnotation(annotationId: string, data: AnnotationCreateData): Promise<Annotation | null> {
    if (!hasLoggedIn.value || !nftClassId.value) {
      annotations.value = annotations.value.filter(a => a.id !== annotationId)
      return null
    }

    try {
      const response = await $fetch<{ annotation: Annotation }>(`/api/books/${nftClassId.value}/annotations`, {
        method: 'POST',
        body: data,
      })

      annotations.value = annotations.value.map(a =>
        a.id === annotationId ? response.annotation : a,
      )
      return response.annotation
    }
    catch (error: unknown) {
      annotations.value = annotations.value.filter(a => a.id !== annotationId)
      if (error instanceof FetchError && error.statusCode === 409) {
        await fetchAnnotations()
        const existing = annotations.value.find(a => matchesCreateData(a, data))
        if (existing) return existing
      }
      console.warn(`Failed to create annotation for ${nftClassId.value}:`, error)
      return null
    }
  }

  async function updateAnnotation(annotationId: string, data: AnnotationUpdateData): Promise<Annotation | null> {
    if (!hasLoggedIn.value || !nftClassId.value) {
      return null
    }

    const oldAnnotations = [...annotations.value]
    annotations.value = annotations.value.map((a) => {
      if (a.id !== annotationId || a.type !== 'highlight') return a
      return { ...a, ...data, updatedAt: Date.now() }
    })

    try {
      const response = await apiFetch<{ annotation: Annotation }>(`/books/${nftClassId.value}/annotations/${annotationId}`, {
        method: 'POST',
        retry: API_MAX_RETRIES,
        body: {
          ...data,
          ...(data.note !== undefined ? { note: data.note || '' } : {}),
        },
      })

      annotations.value = annotations.value.map(a =>
        a.id === annotationId ? response.annotation : a,
      )
      return response.annotation
    }
    catch (error) {
      annotations.value = oldAnnotations
      console.warn(`Failed to update annotation ${annotationId}:`, error)
      return null
    }
  }

  async function deleteAnnotation(annotationId: string): Promise<boolean> {
    if (!hasLoggedIn.value || !nftClassId.value) {
      return false
    }

    const deleted = annotations.value.find(a => a.id === annotationId)
    if (!deleted) return false
    annotations.value = annotations.value.filter(a => a.id !== annotationId)

    try {
      await $fetch(`/api/books/${nftClassId.value}/annotations/${annotationId}`, {
        method: 'DELETE',
      })
      return true
    }
    catch (error) {
      // Re-insert only the removed item (preserving createdAt order) so
      // concurrent changes to other annotations during the in-flight DELETE
      // are not clobbered. Skip if a concurrent fetch already restored it.
      if (!annotations.value.some(a => a.id === annotationId)) {
        const insertAt = annotations.value.findIndex(a => a.createdAt > deleted.createdAt)
        annotations.value = insertAt === -1
          ? [...annotations.value, deleted]
          : [...annotations.value.slice(0, insertAt), deleted, ...annotations.value.slice(insertAt)]
      }
      console.warn(`Failed to delete annotation ${annotationId}:`, error)
      return false
    }
  }

  function getAnnotationById(id: string): Annotation | undefined {
    return annotations.value.find(a => a.id === id)
  }

  function getBookmarkByPage(page: number): Annotation | undefined {
    return bookmarks.value.find(a => a.page === page)
  }

  return {
    highlights,
    bookmarks,
    isLoading: computed(() => isLoading.value),
    hasFetched: computed(() => hasFetched.value),
    fetchAnnotations,
    createAnnotation,
    saveAnnotation,
    updateAnnotation,
    deleteAnnotation,
    getAnnotationById,
    getBookmarkByPage,
  }
}
