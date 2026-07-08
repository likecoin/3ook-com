export type FetchFreeClaimableBooksResponseData = string[]

export interface ClaimFreeBookResponseData {
  paymentId: string
  classIds: string
  cartId: string
  claimToken: string
}

export function useFreeBookSessionAPI() {
  const fetch = useLikeCoinSessionFetch()

  function fetchClaimableFreeBooks() {
    return fetch.value<FetchFreeClaimableBooksResponseData>(`/likernft/book/purchase/free`)
  }

  function claimFreeBook(nftClassId: string) {
    return fetch.value<ClaimFreeBookResponseData>(`/likernft/book/purchase/free`, {
      method: 'POST',
      body: { classId: nftClassId },
    })
  }

  return {
    fetchClaimableFreeBooks,
    claimFreeBook,
  }
}
