export function getLikeCoinAPIFetch() {
  const config = useRuntimeConfig()
  return $fetch.create({ baseURL: config.public.likeCoinAPIEndpoint })
}

export function fetchLikerProfileInfo(
  token: string,
): Promise<LikerInfoResponseData> {
  const fetch = getLikeCoinAPIFetch()
  return fetch<LikerInfoResponseData>(`/users/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export function fetchLikerPublicInfoByWalletAddress(
  walletAddress: string,
  options: { nocache?: boolean } = {},
): Promise<LikerInfoResponseData> {
  const fetch = getLikeCoinAPIFetch()
  const query: Record<string, string> = {}
  if (options.nocache) query.ts = `${Date.now()}`
  return fetch<LikerInfoResponseData>(`/users/addr/${walletAddress}/min`, { query })
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
  const fetch = getLikeCoinAPIFetch()
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

export function fetchLikerPublicInfoById(id: string, options: { nocache?: boolean } = {}): Promise<LikerInfoResponseData> {
  const fetch = getLikeCoinAPIFetch()
  const query: Record<string, string> = {}
  if (options.nocache) query.ts = `${Date.now()}`
  return fetch<LikerInfoResponseData>(`/users/id/${id}/min`, { query })
}

export const likeCoinNFTClassAggregatedMetadataOptions = [
  'class_chain',
  'class_api',
  'iscn',
  'owner',
  'purchase',
  'bookstore',
] as const
export type LikeCoinNFTClassAggregatedMetadataOptionKey = typeof likeCoinNFTClassAggregatedMetadataOptions[number]
export interface FetchLikeCoinNFTClassAggregatedMetadataOptions {
  include?: LikeCoinNFTClassAggregatedMetadataOptionKey[]
  exclude?: LikeCoinNFTClassAggregatedMetadataOptionKey[]
  nocache?: boolean
}

export interface FetchLikeCoinNFTClassAggregatedMetadataResponseData {
  classData: NFTClassMetadata | null
  ownerInfo: Record<string, NFTIdList> | null
  bookstoreInfo: BookstoreInfo | null
}

export function fetchLikeCoinNFTClassAggregatedMetadataById(
  nftClassId: string,
  options: FetchLikeCoinNFTClassAggregatedMetadataOptions = { exclude: [] },
) {
  const fetch = getLikeCoinAPIFetch()
  const includedOptionSet = new Set(options.include || likeCoinNFTClassAggregatedMetadataOptions)
  const excludedOptionSet = new Set(options.exclude || [])
  const query: Record<string, string | string[]> = {
    class_id: nftClassId,
    data: [...includedOptionSet].filter(option => !excludedOptionSet.has(option)),
  }
  if (options.nocache) query.ts = `${Math.round(Date.now() / 1000)}`
  return fetch<FetchLikeCoinNFTClassAggregatedMetadataResponseData>('/likerland/nft/metadata', { query })
}
