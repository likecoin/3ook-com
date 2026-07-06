import { MAX_BOOKSTORE_PAGE_SIZE } from '~~/shared/utils/bookstore'
import type { CollectiveBookNFT, CollectiveBookNFTsQueryOptions, CollectivePaginationResponse } from '~~/shared/utils/collective-indexer'

/**
 * Shared client for first-party `/api/*` Nitro routes, with the
 * method-aware retry policy from `createRetryingFetch` (idempotent
 * GET/HEAD retry twice on a `<no response>`; payload methods opt in
 * via an explicit `retry`).
 */
// Bound wedged requests (see createRetryingFetch) so awaits that gate loading
// state — e.g. the bookshelf spinner — can't hang forever.
export const apiFetch = createRetryingFetch({ baseURL: '/api', timeout: API_FETCH_TIMEOUT_MS })

/**
 * Fetches the staking book listing through our same-origin `/api/store/staking-books`
 * proxy instead of hitting the collective indexer directly. iOS WKWebView can wedge
 * a poisoned connection on cross-origin fetches ("Load failed: <no response>"); routing
 * through our origin keeps the cross-origin hop server-side and lets page 1 be cached.
 */
export function fetchStakingBookNFTs({
  sortBy = 'staked_amount',
  sortOrder = 'desc',
  limit = 100,
  key,
}: {
  sortBy?: NonNullable<CollectiveBookNFTsQueryOptions['sort_by']>
  sortOrder?: NonNullable<CollectiveBookNFTsQueryOptions['sort_order']>
  limit?: number
  key?: string | number
} = {}) {
  return apiFetch<CollectivePaginationResponse<CollectiveBookNFT>>('/store/staking-books', {
    query: {
      sort_by: sortBy,
      sort_order: sortOrder,
      limit,
      key,
    },
  })
}

export function fetchBookstoreCMSProductsByTagId(tagId: string, {
  offset,
  limit = MAX_BOOKSTORE_PAGE_SIZE,
  ts,
  isLibrary = false,
}: {
  offset?: string
  limit?: number
  ts?: number
  isLibrary?: boolean
} = {}) {
  return apiFetch<FetchBookstoreCMSProductsResponseData>('/store/products', {
    query: {
      tag: tagId,
      offset,
      limit,
      ts,
      library: isLibrary ? '1' : undefined,
    },
  })
}

export function fetchBookstoreCMSPublicationsBySearchTerm(searchTerm: string, {
  offset,
  limit = MAX_BOOKSTORE_PAGE_SIZE,
  ts,
  isLibrary = false,
}: {
  offset?: string
  limit?: number
  ts?: number
  isLibrary?: boolean
} = {}) {
  return apiFetch<FetchBookstoreCMSProductsResponseData>('/store/search', {
    query: {
      q: searchTerm,
      offset,
      limit,
      ts,
      library: isLibrary ? '1' : undefined,
    },
  })
}

export function fetchBookstoreCMSPublicationsByGenre(genre: string, {
  offset,
  limit = MAX_BOOKSTORE_PAGE_SIZE,
  ts,
  isLibrary = false,
}: {
  offset?: string
  limit?: number
  ts?: number
  isLibrary?: boolean
} = {}) {
  return apiFetch<FetchBookstoreCMSProductsResponseData>('/store/genre', {
    query: {
      q: genre,
      offset,
      limit,
      ts,
      library: isLibrary ? '1' : undefined,
    },
  })
}

export function fetchBookstoreCMSTagsForAll() {
  return apiFetch<FetchBookstoreCMSTagsResponseData>('/store/tags')
}

export function fetchBookstoreCMSTagById(tagId: string) {
  return apiFetch<BookstoreCMSTag>(`/store/tags/${tagId}`)
}

export function getEncryptedArweaveLinkAPIEndpoint() {
  const config = useRuntimeConfig()
  return `${config.public.likeCoinAPIEndpoint}/arweave/v2/link`
}
