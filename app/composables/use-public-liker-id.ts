/**
 * The Liker ID shown publicly — as the referral code, and in share and affiliate
 * links. The account's internal id never moves; a rename only writes `handle`,
 * so the two diverging is also what marks the one-time rename as spent.
 */
export function usePublicLikerId() {
  const { user } = useUserSession()

  const publicLikerId = computed(() => user.value?.handle || user.value?.likerId || '')
  const hasLikerIdChanged = computed(() =>
    !!user.value?.handle && user.value.handle !== user.value.likerId)

  return {
    publicLikerId,
    hasLikerIdChanged,
  }
}
