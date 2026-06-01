/**
 * Registers a borrowed (non-owned) Plus-reading book on the shelf when it's
 * opened in the reader. A borrow is detected by: active Plus, the book flagged
 * `isPlusReadingEnabled`, the user not owning it, and no `nft_id` in the route
 * (an owned read always carries one). Used by both the EPUB and PDF readers.
 */
export function usePlusReadingTracker(params: {
  nftClassId: MaybeRef<string>
  isUploadedBook: Ref<boolean>
  isPlusReadingEnabled: Ref<boolean>
  nftId: Ref<string | undefined>
}) {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const { isLikerPlus } = useSubscription()
  const nftStore = useNFTStore()
  const bookshelfStore = useBookshelfStore()

  const nftClassIdRef = computed(() => toValue(params.nftClassId))
  const { checkOwnership } = useUserBookOwnership(nftClassIdRef)

  async function registerIfBorrowed() {
    if (!import.meta.client) return
    if (params.isUploadedBook.value) return
    if (!hasLoggedIn.value || !isLikerPlus.value) return
    // An owned read carries an nft_id in the route; a borrow never does.
    if (params.nftId.value) return

    // Resolve ownership and the plus-reading flag before deciding.
    const [isOwner] = await Promise.all([
      checkOwnership(),
      nftStore.lazyFetchNFTClassAggregatedMetadataById(nftClassIdRef.value).catch(() => {}),
    ])
    if (isOwner) return
    if (!params.isPlusReadingEnabled.value) return

    await bookshelfStore.registerPlusReadingOpen(nftClassIdRef.value)
  }

  onMounted(registerIfBorrowed)
}
