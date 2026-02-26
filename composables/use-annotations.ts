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
      note: data.note || '',
      chapterTitle: data.chapterTitle || '',
      createdAt: now,
      updatedAt: now,
    }
    annotations.value = [...annotations.value, annotation]
    return annotation
  }

  async function saveAnnotation(annotationId: string, data: AnnotationCreateData): Promise<Annotation | null> {
    if (!hasLoggedIn.value || !nftClassId.value) {
      annotations.value = annotations.value.filter(a => a.id !== annotationId)
      return null
    }

    try {
      const response = await $fetch<{ annotation: Annotation }>(`/api/books/${nftClassId.value}/annotations`, {
        method: 'POST',
        body: {
          ...data,
          note: data.note || '',
        },
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
        const existing = annotations.value.find(a => a.cfi === data.cfi)
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
    annotations.value = annotations.value.map(a =>
      a.id === annotationId ? { ...a, ...data, updatedAt: Date.now() } : a,
    )

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

    try {
      await $fetch(`/api/books/${nftClassId.value}/annotations/${annotationId}`, {
        method: 'DELETE',
      })

      annotations.value = annotations.value.filter(a => a.id !== annotationId)
      return true
    }
    catch (error) {
      console.warn(`Failed to delete annotation ${annotationId}:`, error)
      return false
    }
  }

  function getAnnotationByCfi(cfi: string): Annotation | undefined {
    return annotations.value.find(a => a.cfi === cfi)
  }

  function getAnnotationById(id: string): Annotation | undefined {
    return annotations.value.find(a => a.id === id)
  }

  return {
    annotations: computed(() => annotations.value),
    isLoading: computed(() => isLoading.value),
    hasFetched: computed(() => hasFetched.value),
    fetchAnnotations,
    createAnnotation,
    saveAnnotation,
    updateAnnotation,
    deleteAnnotation,
    getAnnotationByCfi,
    getAnnotationById,
  }
}
