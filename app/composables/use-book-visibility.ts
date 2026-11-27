// Feed and indexer candidates carry no `isHidden` flag, so live bookstore info is
// the only place hidden books can be dropped. Unresolved info keeps the book —
// a slow or failed metadata fetch must not blank a listing.
export function useBookVisibility() {
  const queryCache = useQueryCache()
  const isAdultContentEnabled = useAdultContentSetting()
  const { getIsRegionRestricted } = useBookRegionGate()

  function getIsBookVisible(nftClassId: string) {
    const bookstoreInfo = getBookstoreInfoByNFTClassIdFromCache(queryCache, nftClassId)
    // null is a resolved "no listing"; undefined is merely unresolved.
    if (bookstoreInfo === null) return false
    if (bookstoreInfo?.isHidden) return false
    if (!isAdultContentEnabled.value && bookstoreInfo?.isAdultOnly) return false
    if (getIsRegionRestricted(bookstoreInfo?.restrictedTerritories)) return false
    return true
  }

  return { getIsBookVisible }
}
