// Personalized recommendations from /api/store/for-you, resolved to class ids.
// Resolves empty for guests and on failure so callers can simply hide the surface.
export function useBookRecommendations() {
  const { loggedIn: hasLoggedIn } = useUserSession()

  async function fetchRecommendedNFTClassIds({
    seed,
    limit = 10,
    isLibrary = false,
  }: {
    seed?: string
    limit?: number
    isLibrary?: boolean
  } = {}): Promise<string[]> {
    if (!hasLoggedIn.value) return []
    try {
      const result = await fetchBookstoreForYouProducts({ seed, limit, isLibrary })
      return result.records
        .map(item => item.classId || item.id)
        .filter((id): id is string => !!id)
    }
    catch (error) {
      console.warn('Failed to fetch book recommendations:', error)
      return []
    }
  }

  return {
    fetchRecommendedNFTClassIds,
  }
}
