/**
 * Shared client for first-party `/api/*` Nitro routes, with the
 * method-aware retry policy from `createRetryingFetch` (idempotent
 * GET/HEAD retry twice on a `<no response>`; payload methods opt in
 * via an explicit `retry`).
 */
export const apiFetch = createRetryingFetch({ baseURL: '/api' })

export function fetchBookstoreCMSProductsByTagId(tagId: string, {
  offset,
  limit = 100,
  ts,
  live,
}: {
  offset?: string
  limit?: number
  ts?: number
  live?: boolean
} = {}) {
  return apiFetch<FetchBookstoreCMSProductsResponseData>('/store/products', {
    query: {
      tag: tagId,
      offset,
      limit,
      ts,
      live: live ? 1 : undefined,
    },
  })
}

export function fetchBookstoreCMSPublicationsBySearchTerm(searchTerm: string, {
  offset,
  limit = 100,
  ts,
}: {
  offset?: string
  limit?: number
  ts?: number
} = {}) {
  return apiFetch<FetchBookstoreCMSProductsResponseData>('/store/search', {
    query: {
      q: searchTerm,
      offset,
      limit,
      ts,
    },
  })
}

export function fetchBookstoreCMSPublicationsByGenre(genre: string, {
  offset,
  limit = 100,
  ts,
}: {
  offset?: string
  limit?: number
  ts?: number
} = {}) {
  return apiFetch<FetchBookstoreCMSProductsResponseData>('/store/genre', {
    query: {
      q: genre,
      offset,
      limit,
      ts,
    },
  })
}

export function fetchBookstoreCMSTagsForAll({
  offset,
  limit,
  ts,
}: {
  offset?: string
  limit?: number
  ts?: number
} = {}) {
  return apiFetch<FetchBookstoreCMSTagsResponseData>('/store/tags', {
    query: {
      offset,
      limit,
      ts,
    },
  })
}

export function fetchBookstoreCMSTagById(tagId: string) {
  return apiFetch<BookstoreCMSTag>(`/store/tags/${tagId}`)
}

export function getEncryptedArweaveLinkAPIEndpoint() {
  const config = useRuntimeConfig()
  return `${config.public.likeCoinAPIEndpoint}/arweave/v2/link`
}
