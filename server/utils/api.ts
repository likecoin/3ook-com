import type { LikerInfoResponseData } from '~/utils/api'

export function getLikeCoinAPIFetch() {
  const config = useRuntimeConfig()
  return $fetch.create({ baseURL: config.public.likeCoinAPIEndpoint })
}

// TODO: Combine with `fetchLikerPublicInfoByWalletAddress` in ~/utils/api.ts
// since composable cannot be used in server-side code
export function fetchLikerPublicInfoByWalletAddress(
  walletAddress: string,
  options: { nocache?: boolean } = {},
): Promise<LikerInfoResponseData> {
  const fetch = getLikeCoinAPIFetch()
  const query: Record<string, string> = {}
  if (options.nocache) query.ts = `${Date.now()}`
  return fetch<LikerInfoResponseData>(`/users/addr/${walletAddress}/min`, { query })
}
