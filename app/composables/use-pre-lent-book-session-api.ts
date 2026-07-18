export type FetchPreLentNFTClassIdsResponseData = string[]

export function usePreLentBookSessionAPI() {
  const fetch = useLikeCoinSessionFetch()

  function fetchPreLentNFTClassIds() {
    return fetch.value<FetchPreLentNFTClassIdsResponseData>(`/likernft/book/purchase/free`)
  }

  return {
    fetchPreLentNFTClassIds,
  }
}
