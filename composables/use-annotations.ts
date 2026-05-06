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
    fetchPromise.value = $fetch<{ annotations: Annotation[] }>(`/api/books/${nftClassId.value}/annotations`)
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
      const response = await $fetch<{ annotation: Annotation }>(`/api/books/${nftClassId.value}/annotations/${annotationId}`, {
        method: 'POST',
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

    const previous = annotations.value
    if (!previous.some(a => a.id === annotationId)) return false
    annotations.value = previous.filter(a => a.id !== annotationId)

    try {
      await $fetch(`/api/books/${nftClassId.value}/annotations/${annotationId}`, {
        method: 'DELETE',
      })
      return true
    }
    catch (error) {
      annotations.value = previous
      console.warn(`Failed to delete annotation ${annotationId}:`, error)
      return false
    }
  }

  function getAnnotationById(id: string): Annotation | undefined {
    return annotations.value.find(a => a.id === id)
  }

  function getBookmarkByCfi(cfi: string): Annotation | undefined {
    return bookmarks.value.find(a => a.cfi === cfi)
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
    getBookmarkByCfi,
    getBookmarkByPage,
  }
}
