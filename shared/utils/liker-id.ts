export function normalizeLikerId(likerId: string): string {
  return likerId.startsWith('@') ? likerId.slice(1) : likerId
}

// Canonical stored form of a user-supplied handle: no `@`, no padding, lowercase.
export function getCanonicalLikerId(input: string): string {
  return normalizeLikerId(input.trim()).toLowerCase()
}

// Inverse of normalizeLikerId. The `@` prefix is the wire format of the `from`
// query param, which affiliate consumers gate on before treating it as a referrer.
export function formatLikerIdHandle(likerId: string): string {
  return `@${normalizeLikerId(likerId)}`
}

// Liker ID of an `@`-prefixed handle; undefined otherwise (e.g. bare channel strings)
export function parseLikerIdHandle(handle?: string): string | undefined {
  return handle?.startsWith('@') ? normalizeLikerId(handle) : undefined
}

export const LIKER_ID_MIN_LENGTH = 5
export const LIKER_ID_MAX_LENGTH = 20

// Mirrors the API's checkUserNameValid (MIN/MAX_USER_ID_LENGTH + character set),
// so a bad handle is rejected before spending a round-trip.
export function checkLikerIdValid(likerId: string): boolean {
  return /^[a-z0-9-_]+$/.test(likerId)
    && likerId.length >= LIKER_ID_MIN_LENGTH
    && likerId.length <= LIKER_ID_MAX_LENGTH
}

// A link rewriter appending `?fbclid=` to a URL that already has a query
// leaves `@likerId?fbclid=…` in `from`. Returns the clean `from`, canonical
// or undefined for an invalid handle, plus the glued-on params as their own keys.
export function parseFromQuery(rawFrom: string): { from?: string, gluedQuery: Record<string, string> } {
  const tailIndex = rawFrom.search(/[?&#]/)
  const gluedQuery: Record<string, string> = {}
  if (tailIndex >= 0) {
    for (const [key, value] of new URLSearchParams(rawFrom.slice(tailIndex + 1))) {
      if (key && !(key in gluedQuery)) gluedQuery[key] = value
    }
  }
  const from = (tailIndex < 0 ? rawFrom : rawFrom.slice(0, tailIndex)).trim()
  if (!from.startsWith('@')) return { from: from || undefined, gluedQuery }
  const likerId = getCanonicalLikerId(from)
  return { from: checkLikerIdValid(likerId) ? formatLikerIdHandle(likerId) : undefined, gluedQuery }
}
