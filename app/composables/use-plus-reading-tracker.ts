/**
 * Registers a borrowed (non-owned) Plus-reading book on the shelf when it's
 * opened in the reader. A borrow is detected by: the book flagged
 * `isPlusReadingEnabled`, the user not owning it, no `nft_id` in the route
 * (an owned read always carries one), and either active Plus or a free edition
 * (which any logged-in user may borrow). Used by both the EPUB and PDF readers.
 * An owned read instead returns any borrow left over from before the purchase.
 */
export function usePlusReadingTracker(params: {
  nftClassId: MaybeRef<string>
  isUploadedBook: Ref<boolean>
  isPlusReadingEnabled: Ref<boolean>
  hasFreeEdition: Ref<boolean>
  nftId: Ref<string | undefined>
}) {
  const { loggedIn: hasLoggedIn, user } = useUserSession()
  const { isLikerPlus } = useSubscription()
  const queryCache = useQueryCache()
  const bookshelfStore = useBookshelfStore()

  const nftClassIdRef = computed(() => toValue(params.nftClassId))
  const { isOwner, checkOwnership } = useUserBookOwnership(nftClassIdRef)
  // The surface that led to this read, snapshotted before any in-reader navigation.
  const entryLinkTagProperties = useEntryLinkTagProperties()

  // True once the open is confirmed a borrowed Plus-library read (vs an owned or
  // free read). Resolved asynchronously, so read it at emit time, not on mount.
  const isLibraryBook = ref(false)
  // Resolves to the final `isLibraryBook` ahead of the registration round-trip,
  // for callers that must decide on it right after the book opens.
  const { promise: libraryBookCheck, resolve: settleLibraryBookCheck } = Promise.withResolvers<boolean>()

  async function getIsBorrowed() {
    if (params.isUploadedBook.value) return false
    if (!hasLoggedIn.value) return false
    // An owned read carries an nft_id in the route; a borrow never does.
    if (params.nftId.value) return false

    // Resolve ownership and the plus-reading flag before deciding.
    const [isOwner] = await Promise.all([
      checkOwnership(),
      ensureNFTClassAggregatedMetadataThroughCache(queryCache, nftClassIdRef.value).catch(() => {}),
    ])
    if (isOwner) return false
    if (!params.isPlusReadingEnabled.value) return false
    // Plus members borrow any Plus-reading book; non-Plus users only free ones.
    return isLikerPlus.value || params.hasFreeEdition.value
  }

  // A purchase supersedes the borrow: drop the stale library record
  // rather than asking the user to return a book they already own.
  async function returnBorrowIfOwned(snapshot: { likerId?: string, nftClassId: string }) {
    if (params.isUploadedBook.value || !hasLoggedIn.value) return
    // `getIsBorrowed` has already resolved ownership unless the route's nft_id proved it.
    if (!params.nftId.value && !isOwner.value) return
    await bookshelfStore.lazyFetchPlusReadingBooks()
    // A logout, account switch or in-place switch to another book meanwhile
    // would return the wrong borrow, or send the DELETE under the new session.
    if (
      !hasLoggedIn.value
      || user.value?.likerId !== snapshot.likerId
      || nftClassIdRef.value !== snapshot.nftClassId
    ) return
    const normalizedNFTClassId = normalizeNFTClassId(snapshot.nftClassId)
    if (!bookshelfStore.plusReadingBookIds.includes(normalizedNFTClassId)) return
    useLogEvent('plus_reading_auto_return', { nft_class_id: snapshot.nftClassId })
    await bookshelfStore.removePlusReadingBook(normalizedNFTClassId)
  }

  async function registerIfBorrowed() {
    if (!import.meta.client) return
    const snapshot = { likerId: user.value?.likerId, nftClassId: nftClassIdRef.value }
    try {
      isLibraryBook.value = await getIsBorrowed()
    }
    finally {
      settleLibraryBookCheck(isLibraryBook.value)
    }
    if (!isLibraryBook.value) {
      await returnBorrowIfOwned(snapshot)
      return
    }

    // Read borrow state before registration mutates it to tell first borrows from re-opens.
    useLogEvent('plus_reading_borrow', {
      nft_class_id: nftClassIdRef.value,
      is_free_borrow: !isLikerPlus.value,
      is_first_borrow: !bookshelfStore.plusReadingBookIds.includes(normalizeNFTClassId(nftClassIdRef.value)),
      ...entryLinkTagProperties,
    })
    await bookshelfStore.registerPlusReadingOpen(nftClassIdRef.value)
  }

  onMounted(registerIfBorrowed)

  return { isLibraryBook: readonly(isLibraryBook), libraryBookCheck }
}
