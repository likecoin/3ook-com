export interface PaginationInfo {
  next_key?: number
  count: number
}

export interface FetchNFTClassesByOwnerWalletAddressResponseData {
  data: NFTClass[]
  pagination: PaginationInfo
}

export interface FetchNFTsByWalletAddressResponseData {
  data: NFT[]
  pagination: PaginationInfo
}

export interface FetchLikeCoinNFTClassChainMetadataResponseData {
  metadata: NFTClassMetadata
}

export function getIndexerAPIFetch() {
  const config = useRuntimeConfig()
  return $fetch.create({ baseURL: config.public.likeCoinEVMChainAPIEndpoint })
}

export interface IndexerQueryOptions {
  reverse?: boolean
  limit?: number
  key?: string
  nocache?: boolean
}

export function getIndexerQueryOptions({
  reverse = true,
  limit = 30,
  key,
  nocache,
}: IndexerQueryOptions = {}) {
  const query: Record<string, string> = {}
  if (reverse) query.reverse = reverse.toString()
  if (limit) query['pagination.limit'] = limit.toString()
  if (key) query['pagination.key'] = key
  if (nocache) query.ts = Date.now().toString()
  return query
}

export function fetchNFTClassesByOwnerWalletAddress(walletAddress: string, options: IndexerQueryOptions) {
  const fetch = getIndexerAPIFetch()
  return fetch<FetchNFTClassesByOwnerWalletAddressResponseData>(`/account/${walletAddress}/booknfts`, {
    query: getIndexerQueryOptions(options),
  })
};

export function fetchNFTsByOwnerWalletAddress(walletAddress: string, options: IndexerQueryOptions) {
  const fetch = getIndexerAPIFetch()
  return fetch<FetchNFTsByWalletAddressResponseData>(`/account/${walletAddress}/tokens`, {
    query: getIndexerQueryOptions(options),
  })
};

export function fetchLikeCoinNFTClassChainMetadataById(nftClassId: string) {
  const fetch = getIndexerAPIFetch()
  return fetch<FetchLikeCoinNFTClassChainMetadataResponseData>(`/booknft/${nftClassId}`)
}
