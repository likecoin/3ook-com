export function fetchBookstoreCMSProductsByTagId(tagId: string, {
  offset,
  limit = 100,
  ts,
}: {
  offset?: string
  limit?: number
  ts?: number
} = {}) {
  return $fetch<FetchBookstoreCMSProductsResponseData>('/api/store/products', {
    query: {
      tag: tagId,
      offset,
      limit,
      ts,
    },
    credentials: 'include',
    mode: 'no-cors',
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
  return $fetch<FetchBookstoreCMSProductsResponseData>('/api/store/search', {
    query: {
      q: searchTerm,
      offset,
      limit,
      ts,
    },
    credentials: 'include',
    mode: 'no-cors',
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
  return $fetch<FetchBookstoreCMSTagsResponseData>('/api/store/tags', {
    query: {
      offset,
      limit,
      ts,
    },
    credentials: 'include',
    mode: 'no-cors',
  })
}

export function fetchBookstoreCMSTagById(tagId: string) {
  return $fetch<BookstoreCMSTag>(`/api/store/tags/${tagId}`, {
    credentials: 'include',
    mode: 'no-cors',
  })
}

export function getEncryptedArweaveLinkAPIEndpoint() {
  const config = useRuntimeConfig()
  return `${config.public.likeCoinAPIEndpoint}/arweave/v2/link`
}
