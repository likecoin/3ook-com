// Caps one sentinel hit, so a tag mostly hidden from this reader doesn't walk its whole catalogue.
export const MAX_PAGES_PER_SENTINEL_HIT = 5

// Client-side filters can leave a fetched page too short to push the sentinel out of view,
// and the IntersectionObserver won't re-fire for an unmoved sentinel, so keep fetching while it stays visible.
// Also stops on a failed fetch or a cursor that is exhausted or already seen.
export async function fetchWhileSentinelVisible({
  fetchPage,
  getCursor,
  isSentinelStillVisible,
  maxPages = MAX_PAGES_PER_SENTINEL_HIT,
}: {
  fetchPage: () => Promise<boolean>
  getCursor: () => string | number | undefined
  // Resolves after the new items render, so the observer has caught up.
  isSentinelStillVisible: () => Promise<boolean>
  maxPages?: number
}) {
  const seenCursors = new Set([getCursor()])
  for (let page = 0; page < maxPages; page++) {
    if (!await fetchPage()) return
    const cursor = getCursor()
    if (cursor === undefined || seenCursors.has(cursor)) return
    if (!await isSentinelStillVisible()) return
    seenCursors.add(cursor)
  }
}
