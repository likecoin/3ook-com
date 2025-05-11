export interface FetchLegacyLikeCoinChainNFTClassesConfig {
  classOwner?: string
  nftOwner?: string
  expand?: boolean
  reverse?: boolean
  limit?: number
  key?: string
  nocache?: boolean
}

export interface FetchLegacyLikeCoinChainNFTClassesResponseData {
  classes: LegacyNFTClass[]
  pagination: {
    next_key?: number
    count: number
  }
}

export function fetchLegacyLikeCoinChainNFTClasses({
  classOwner,
  nftOwner,
  expand = false,
  reverse = true,
  limit = 100,
  key,
  nocache,
}: FetchLegacyLikeCoinChainNFTClassesConfig) {
  const query: Record<string, string> = {}
  if (classOwner) query.iscn_owner = classOwner
  if (nftOwner) query.owner = nftOwner
  if (expand) query.expand = expand.toString()
  if (reverse) query['pagination.reverse'] = reverse.toString()
  if (limit) query['pagination.limit'] = limit.toString()
  if (key) query['pagination.key'] = key
  if (nocache) query.ts = `${Math.round(new Date().getTime() / 1000)}`
  const { fetch } = useLegacyLikeCoinChainAPI()
  return fetch<FetchLegacyLikeCoinChainNFTClassesResponseData>('/likechain/likenft/v1/class', { query })
}

export interface FetchLikeCoinChainNFTClassesConfig {
  classOwner?: string
  reverse?: boolean
  limit?: number
  key?: string
  nocache?: boolean
}

export interface FetchLikeCoinChainNFTClassesResponseData {
  data: NFTClass[]
  pagination: {
    next_key?: number
    count: number
  }
}

export function fetchLikeCoinChainNFTClasses({
  classOwner,
  reverse = true,
  limit = 100,
  key,
  nocache,
}: FetchLikeCoinChainNFTClassesConfig) {
  const query: Record<string, string> = {}
  if (reverse) query['pagination.reverse'] = reverse.toString()
  if (limit) query['pagination.limit'] = limit.toString()
  if (key) query['pagination.key'] = key
  if (nocache) query.ts = `${Math.round(new Date().getTime() / 1000)}`
  const { fetch } = useLikeCoinEVMChainAPI()
  return fetch<FetchLikeCoinChainNFTClassesResponseData>(`/account/${classOwner}/booknfts`, {
    query,
  })
};

export interface FetchLikeCoinChainNFTsConfig {
  nftOwner?: string
  reverse?: boolean
  limit?: number
  key?: string
  nocache?: boolean
}

export interface FetchLikeCoinChainNFTsResponseData {
  data: NFT[]
  pagination: {
    next_key?: number
    count: number
  }
}

export function fetchLikeCoinChainNFTs({
  nftOwner,
  reverse = true,
  limit = 100,
  key,
  nocache,
}: FetchLikeCoinChainNFTsConfig) {
  const query: Record<string, string> = {}
  if (reverse) query['pagination.reverse'] = reverse.toString()
  if (limit) query['pagination.limit'] = limit.toString()
  if (key) query['pagination.key'] = key
  if (nocache) query.ts = `${Math.round(new Date().getTime() / 1000)}`
  const { fetch } = useLikeCoinEVMChainAPI()
  return fetch<FetchLikeCoinChainNFTsResponseData>(`/account/${nftOwner}/tokens`, {
    query,
  })
};

export interface FetchISCNRecordsResponseData {
  latest_version: string
  owner: string
  records: ISCNRecord[]
}

export function fetchLikeCoinChainISCNRecordsByIdPrefix(iscnIdPrefix: string) {
  const { fetch } = useLegacyLikeCoinChainAPI()
  return fetch<FetchISCNRecordsResponseData>('/iscn/records/id', { query: { iscn_id: iscnIdPrefix } })
}

interface FetchLegacyLikeCoinChainNFTClassOwnersResponseData {
  owners: NFTOwner[]
  pagination: {
    next_key?: number
    count: number
  }
}

export function fetchLegacyLikeCoinChainNFTClassOwnersById(nftClassId: string, { nextKey }: { nextKey?: number } = {}) {
  const { fetch } = useLegacyLikeCoinChainAPI()
  return fetch<FetchLegacyLikeCoinChainNFTClassOwnersResponseData>('/likechain/likenft/v1/owner', {
    query: { class_id: nftClassId, next_key: nextKey },
  })
}

export const likeCoinNFTClassAggregatedMetadataOptions = ['class_chain', 'class_api', 'iscn', 'owner', 'purchase', 'bookstore'] as const
export type LikeCoinNFTClassAggregatedMetadataOptionKey = typeof likeCoinNFTClassAggregatedMetadataOptions[number]
export interface FetchLikeCoinNFTClassAggregatedMetadataOptions {
  exclude?: LikeCoinNFTClassAggregatedMetadataOptionKey[]
}

export interface FetchLikeCoinNFTClassAggregatedMetadataResponseData {
  classData: LegacyNFTClass | NFTClassMetadata | null
  iscnData: ISCNData | null
  ownerInfo: Record<string, NFTIdList> | null
  bookstoreInfo: BookstoreInfo | null
}

export function fetchLikeCoinNFTClassAggregatedMetadataById(nftClassId: string, options: FetchLikeCoinNFTClassAggregatedMetadataOptions = { exclude: [] }) {
  const { fetch } = useLikeCoinAPI()
  const excludedOptionSet = new Set(options.exclude || [])
  return fetch<FetchLikeCoinNFTClassAggregatedMetadataResponseData>('/likerland/nft/metadata', {
    query: {
      class_id: nftClassId,
      data: likeCoinNFTClassAggregatedMetadataOptions.filter(option => !excludedOptionSet.has(option)),
    },
  })
}
