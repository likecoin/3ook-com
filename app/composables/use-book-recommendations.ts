export function getEmptyBookRecommendations(): BookRecommendations {
  return { nftClassIds: [], isPersonalized: false, feedId: '', feedServeId: '' }
}

// The For You feed resolved to class ids. Resolves empty for guests and on
// failure, so callers can simply hide the surface.
export function useBookRecommendations() {
  const { loggedIn: hasLoggedIn } = useUserSession()

  async function fetchBookRecommendations({
    seed,
    limit = 10,
    isLibrary = false,
  }: {
    seed?: string
    limit?: number
    isLibrary?: boolean
  } = {}): Promise<BookRecommendations> {
    if (!hasLoggedIn.value) return getEmptyBookRecommendations()
    try {
      const result = await fetchBookstoreForYouProducts({ seed, limit, isLibrary })
      return {
        nftClassIds: result.records.map(getCandidateClassId).filter(Boolean),
        isPersonalized: result.isPersonalized,
        feedId: result.feedId,
        feedServeId: result.feedServeId,
      }
    }
    catch (error) {
      console.warn('Failed to fetch book recommendations:', error)
      useLogRecommendFetchError(error, { isSeeded: !!seed, isLibrary })
      return getEmptyBookRecommendations()
    }
  }

  return {
    fetchBookRecommendations,
  }
}
