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
  limit = 30,
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
  include?: LikeCoinNFTClassAggregatedMetadataOptionKey[]
  exclude?: LikeCoinNFTClassAggregatedMetadataOptionKey[]
  nocache?: boolean
}

export interface FetchLikeCoinNFTClassAggregatedMetadataResponseData {
  classData: LegacyNFTClass | NFTClassMetadata | null
  iscnData: ISCNData | null
  ownerInfo: Record<string, NFTIdList> | null
  bookstoreInfo: BookstoreInfo | null
}

export function fetchLikeCoinNFTClassAggregatedMetadataById(nftClassId: string, options: FetchLikeCoinNFTClassAggregatedMetadataOptions = { exclude: [] }) {
  const { fetch } = useLikeCoinAPI()
  const includedOptionSet = new Set(options.include || likeCoinNFTClassAggregatedMetadataOptions)
  const excludedOptionSet = new Set(options.exclude || [])
  const query: Record<string, string | string[]> = {
    class_id: nftClassId,
    data: [...includedOptionSet].filter(option => !excludedOptionSet.has(option)),
  }
  if (options.nocache) query.ts = `${Math.round(Date.now() / 1000)}`
  return fetch<FetchLikeCoinNFTClassAggregatedMetadataResponseData>('/likerland/nft/metadata', { query })
}

export function createNFTBookPurchase({
  email,
  nftClassId,
  from = 'liker_land',
  price,
  priceIndex,
  coupon,
  language,
  referrer,
  utmCampaign,
  utmMedium,
  utmSource,
  gaClientId,
  gaSessionId,
  gadClickId,
  gadSource,
  fbClickId,
}: {
  email?: string
  nftClassId: string
  price: number
  priceIndex: number
  coupon?: string
  from?: string
  language?: string
  referrer?: string
  utmCampaign?: string
  utmMedium?: string
  utmSource?: string
  gaClientId?: string
  gaSessionId?: string
  gadClickId?: string
  gadSource?: string
  fbClickId?: string
}) {
  const { fetch } = useLikeCoinAPI()
  return fetch<{ url: string, paymentId: string }>(`/likernft/book/purchase/${nftClassId}/new`, {
    method: 'POST',
    query: {
      price_index: priceIndex,
      from,
    },
    body: {
      email,
      customPriceInDecimal: Math.floor(price * 100),
      coupon,
      language,
      referrer,
      utmCampaign,
      utmSource,
      utmMedium,
      gaClientId,
      gaSessionId,
      gadClickId,
      gadSource,
      fbClickId,
      site: '3ook.com',
    },
  })
}

export interface FetchCartStatusByIdResponseData {
  email: string
  status: 'paid' | 'pendingClaim' | 'pending' | 'pendingNFT' | 'completed' | 'done'
  sessionId: string
  isPaid: boolean
  isPendingClaim: boolean
  priceInDecimal: number
  price: number
  originalPriceInDecimal: number
  from: string
  timestamp: number
  quantity: number
  classIds: string[]
  classIdsWithPrice: {
    classId: string
    priceIndex: number
    quantity: number
    price: number
    priceInDecimal: number
    originalPriceInDecimal: number
  }[]
}

export function fetchCartStatusById({ cartId, token }: { cartId: string, token: string }) {
  const { fetch } = useLikeCoinAPI()
  return fetch<FetchCartStatusByIdResponseData>(`/likernft/book/purchase/cart/${cartId}/status`, {
    query: { token },
  })
}

export interface ClaimCartByIdResponseData {
  classIds: string[]
  newClaimedNFTs: {
    classId: string
    nftId: string
  }[]
  allItemsAutoClaimed: boolean
  errors?: { error: string }[]
}

export function claimCartById({ cartId, token, paymentId, wallet }: { cartId: string, token: string, paymentId: string, wallet: string }) {
  const { fetch } = useLikeCoinAPI()
  return fetch<ClaimCartByIdResponseData>(`/likernft/book/purchase/cart/${cartId}/claim`, {
    method: 'POST',
    query: { token },
    body: { wallet, paymentId },
  })
}

export interface BookstoreCMSProductItem {
  id: string
  classId: string
  title: string
  imageUrl: string
  locales: string[]
  isDRMFree: boolean
  minPrice: number
  timestamp: number
}

export interface FetchBookstoreCMSProductsByTagIdResponseData {
  records: Array<BookstoreCMSProductItem>
  offset?: string
}

export function fetchBookstoreCMSProductsByTagId(tagId: string, { offset, limit = 100 }: { offset?: string, limit?: number }) {
  return $fetch<FetchBookstoreCMSProductsByTagIdResponseData>('/api/store/products', {
    query: {
      tag: tagId,
      offset,
      limit,
    },
  })
}

export function fetchUserRegisterCheck({
  accountId,
  walletAddress,
  email,
  magicDIDToken,
}: {
  accountId?: string
  walletAddress?: string
  email?: string
  magicDIDToken?: string
}) {
  const { fetch } = useLikeCoinAPI()
  return fetch(`/users/new/check`, {
    method: 'POST',
    body: {
      user: accountId,
      evmWallet: walletAddress,
      email,
      magicDIDToken,
    },
  })
}

export interface LikerInfoResponseData {
  user: string
  displayName: string
  avatar: string
  cosmosWallet: string
  likeWallet: string
  description: string
  isLikerPlus?: boolean
}

export function fetchLikerPublicInfoByWalletAddress(
  walletAddress: string,
  options: { nocache?: boolean } = {},
): Promise<LikerInfoResponseData> {
  const { fetch } = useLikeCoinAPI()
  const query: Record<string, string> = {}
  if (options.nocache) query.ts = `${Date.now()}`
  return fetch<LikerInfoResponseData>(`/users/addr/${walletAddress}/min`, { query })
}

export function getEncryptedArweaveLinkAPIEndpoint() {
  const config = useRuntimeConfig()
  return `${config.public.likeCoinAPIEndpoint}/arweave/v2/link`
}

export interface FetchLikerPlusCheckoutLinkResponseData {
  sessionId: string
  url: string
}

export function fetchLikerPlusCheckoutLink({ period = 'monthly' }: { period: 'monthly' | 'yearly' }) {
  const { fetch } = useLikeCoinAPI()
  return fetch<FetchLikerPlusCheckoutLinkResponseData>(`/plus/new`, {
    method: 'POST',
    query: { period },
  })
}

export interface FetchLikerPlusBillingPortalLinkResponseData {
  sessionId: string
  url: string
}

export function fetchLikerPlusBillingPortalLink() {
  const { fetch } = useLikeCoinAPI()
  return fetch<FetchLikerPlusBillingPortalLinkResponseData>(`/plus/portal`, {
    method: 'POST',
  })
}
