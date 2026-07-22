export interface PaginationResponse {
  next_key?: number
  count: number
}

// The indexer reports end-of-list and start-of-list both as `next_key: 0`, so an
// exactly-full last page would otherwise wrap and replay the listing from the top.
export function getIndexerNextKey(
  response: { data: unknown[], pagination?: { next_key?: number } },
  limit: number,
) {
  const nextKey = response.pagination?.next_key
  return response.data.length < limit || !nextKey ? undefined : nextKey
}

export interface NFTClassWithTokenId extends NFTClass {
  token_id?: string
}

export interface FetchNFTClassesByOwnerWalletAddressResponseData {
  data: NFTClassWithTokenId[]
  pagination: PaginationResponse
}

export interface FetchNFTsByWalletAddressResponseData {
  data: NFT[]
  pagination: PaginationResponse
}

export interface FetchLikeCoinNFTClassChainMetadataResponseData {
  metadata: NFTClassMetadata
}

export interface FetchBookNFTsResponseData {
  data: NFTClass[]
  pagination: PaginationResponse
}

export interface FetchTokensByBookNFTResponseData {
  data: NFT[]
  pagination: PaginationResponse
}

export interface FetchTokenAccountsByBookNFTResponseData {
  data: NFTAccount[]
  pagination: PaginationResponse
}

export interface FetchAccountByBookNFTResponseData {
  account: NFTAccount
}

export function getIndexerAPIFetch() {
  const config = useRuntimeConfig()
  // Bound wedged requests (see createRetryingFetch) so the bookshelf pagination
  // await can't hang, stranding the shelf on its loading spinner.
  return createRetryingFetch({ baseURL: config.public.likeCoinEVMChainAPIEndpoint, timeout: API_FETCH_TIMEOUT_MS })
}

export interface IndexerQueryOptions {
  reverse?: boolean
  limit?: number
  key?: string
  nocache?: boolean
  isBooksOnly?: boolean
  filter?: Record<string, string>
}

export function getIndexerQueryOptions({
  reverse = true,
  limit = 30,
  key,
  nocache,
  isBooksOnly = true,
  filter = {},
}: IndexerQueryOptions = {}) {
  const query: Record<string, string> = {}
  if (reverse) query.reverse = reverse.toString()
  if (limit) query['pagination.limit'] = limit.toString()
  if (key) query['pagination.key'] = key
  if (nocache) query.ts = Date.now().toString()
  const contractFilter: string[] = []
  if (isBooksOnly) contractFilter.push('@type', 'Book')
  if (filter) {
    for (const [key, value] of Object.entries(filter)) {
      contractFilter.push(key, value)
    }
  }
  if (contractFilter.length > 0) {
    query['contract_level_metadata_eq'] = contractFilter.join(',')
  }
  return query
}

export function fetchNFTClassesByOwnerWalletAddress(walletAddress: string, options: IndexerQueryOptions = {}) {
  const fetch = getIndexerAPIFetch()
  return fetch<FetchNFTClassesByOwnerWalletAddressResponseData>(`/account/${walletAddress}/booknfts`, {
    query: getIndexerQueryOptions(options),
  })
}

function escapeCommasForFilter(value: string): string {
  return value.replaceAll(',', '%2C')
}

export async function fetchNFTClassesByMetadata(
  filterType: 'author' | 'publisher',
  filterValue: string,
  options: IndexerQueryOptions = {},
): Promise<FetchBookNFTsResponseData> {
  const fetch = getIndexerAPIFetch()
  const escapedFilterValue = escapeCommasForFilter(filterValue)

  // Query both the structured `<type>.name` field and the plain `<type>` field
  const nameOptions = {
    ...options,
    filter: { ...options.filter, [`${filterType}.name`]: escapedFilterValue },
  }
  const valueOptions = {
    ...options,
    filter: { ...options.filter, [filterType]: escapedFilterValue },
  }

  const [nameResult, valueResult] = await Promise.all([
    fetch<FetchBookNFTsResponseData>(`/booknfts`, {
      query: getIndexerQueryOptions(nameOptions),
    }),
    fetch<FetchBookNFTsResponseData>(`/booknfts`, {
      query: getIndexerQueryOptions(valueOptions),
    }),
  ])

  // Merge results and remove duplicates
  const combinedDataMap: Record<string, NFTClass> = {}
  nameResult.data.forEach((item) => {
    combinedDataMap[item.address] = item
  })
  valueResult.data.forEach((item) => {
    combinedDataMap[item.address] = item
  })
  const combinedData = Object.values(combinedDataMap)

  const actualLimit = options.limit || 30
  // Merging two queries can yield more than `actualLimit` items; cap so we
  // never hand the caller a page larger than it asked for.
  const limitedData = combinedData.slice(0, actualLimit)

  const nameNextKey = getIndexerNextKey(nameResult, actualLimit)
  const valueNextKey = getIndexerNextKey(valueResult, actualLimit)
  const combinedNextKey = nameNextKey !== undefined && valueNextKey !== undefined
    ? Math.min(nameNextKey, valueNextKey)
    : nameNextKey ?? valueNextKey

  return {
    data: limitedData,
    pagination: {
      count: limitedData.length,
      next_key: combinedNextKey,
    },
  }
}

export function fetchNFTsByOwnerWalletAddress(walletAddress: string, options: IndexerQueryOptions = {}) {
  const fetch = getIndexerAPIFetch()
  return fetch<FetchNFTsByWalletAddressResponseData>(`/account/${walletAddress}/tokens`, {
    query: getIndexerQueryOptions(options),
  })
}

export function fetchLikeCoinNFTClassChainMetadataById(nftClassId: string) {
  const fetch = getIndexerAPIFetch()
  return fetch<NFTClass>(`/booknft/${normalizeNFTClassId(nftClassId)}`)
}

export function fetchTokenBookNFTsByAccount(walletAddress: string, options: IndexerQueryOptions = {}) {
  const fetch = getIndexerAPIFetch()
  return fetch<FetchNFTClassesByOwnerWalletAddressResponseData>(`/account/${walletAddress}/token-booknfts`, {
    query: getIndexerQueryOptions(options),
  })
}

export function fetchAllBookNFTs(options: IndexerQueryOptions = {}) {
  const fetch = getIndexerAPIFetch()
  return fetch<FetchBookNFTsResponseData>(`/booknfts`, {
    query: getIndexerQueryOptions(options),
  })
}

export function fetchTokensByBookNFT(nftClassId: string, options: IndexerQueryOptions = {}) {
  const fetch = getIndexerAPIFetch()
  return fetch<FetchTokensByBookNFTResponseData>(`/booknft/${normalizeNFTClassId(nftClassId)}/tokens`, {
    query: getIndexerQueryOptions(options),
  })
}

export function fetchTokenAccountsByBookNFT(nftClassId: string, options: IndexerQueryOptions = {}) {
  const fetch = getIndexerAPIFetch()
  return fetch<FetchTokenAccountsByBookNFTResponseData>(`/booknft/${normalizeNFTClassId(nftClassId)}/tokens/account`, {
    query: getIndexerQueryOptions(options),
  })
}

export function fetchAccountByBookNFT(nftClassId: string) {
  const fetch = getIndexerAPIFetch()
  return fetch<FetchAccountByBookNFTResponseData>(`/booknft/${normalizeNFTClassId(nftClassId)}/account`)
}

export function fetchTokenById(nftClassId: string, tokenId: string) {
  const fetch = getIndexerAPIFetch()
  return fetch<NFT>(`/token/${normalizeNFTClassId(nftClassId)}/${tokenId}`)
}
