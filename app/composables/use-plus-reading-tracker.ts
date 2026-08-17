/**
 * Registers a borrowed (non-owned) Plus-reading book on the shelf when it's
 * opened in the reader. A borrow is detected by: the book flagged
 * `isPlusReadingEnabled`, the user not owning it, no `nft_id` in the route
 * (an owned read always carries one), and either active Plus or a free edition
 * (which any logged-in user may borrow). Used by both the EPUB and PDF readers.
 */
export function usePlusReadingTracker(params: {
  nftClassId: MaybeRef<string>
  isUploadedBook: Ref<boolean>
  isPlusReadingEnabled: Ref<boolean>
  hasFreeEdition: Ref<boolean>
  nftId: Ref<string | undefined>
}) {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const { isLikerPlus } = useSubscription()
  const queryCache = useQueryCache()
  const bookshelfStore = useBookshelfStore()

  const nftClassIdRef = computed(() => toValue(params.nftClassId))
  const { checkOwnership } = useUserBookOwnership(nftClassIdRef)
  // The surface that led to this read, snapshotted before any in-reader navigation.
  const entryLinkTags = useEntryLinkTags()

  // True once the open is confirmed a borrowed Plus-library read (vs an owned or
  // free read). Resolved asynchronously, so read it at emit time, not on mount.
  const isLibraryBook = ref(false)

  async function registerIfBorrowed() {
    if (!import.meta.client) return
    if (params.isUploadedBook.value) return
    if (!hasLoggedIn.value) return
    // An owned read carries an nft_id in the route; a borrow never does.
    if (params.nftId.value) return

    // Resolve ownership and the plus-reading flag before deciding.
    const [isOwner] = await Promise.all([
      checkOwnership(),
      ensureNFTClassAggregatedMetadataThroughCache(queryCache, nftClassIdRef.value).catch(() => {}),
    ])
    if (isOwner) return
    if (!params.isPlusReadingEnabled.value) return
    // Plus members borrow any Plus-reading book; non-Plus users only free ones.
    if (!isLikerPlus.value && !params.hasFreeEdition.value) return

    isLibraryBook.value = true
    // Read borrow state before registration mutates it to tell first borrows from re-opens.
    useLogEvent('plus_reading_borrow', {
      nft_class_id: nftClassIdRef.value,
      is_free_borrow: !isLikerPlus.value,
      is_first_borrow: !bookshelfStore.plusReadingBookIds.includes(normalizeNFTClassId(nftClassIdRef.value)),
      ll_medium: entryLinkTags.llMedium,
      ll_source: entryLinkTags.llSource,
    })
    await bookshelfStore.registerPlusReadingOpen(nftClassIdRef.value)
  }

  onMounted(registerIfBorrowed)

  return { isLibraryBook: readonly(isLibraryBook) }
}
