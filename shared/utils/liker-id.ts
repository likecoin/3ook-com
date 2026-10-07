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
// leaves `@likerId?fbclid=…` in `from`. Splits that tail back into its own params.
export function splitGluedFromQuery(rawFrom: string): { from: string, gluedQuery: Record<string, string> } {
  const tailIndex = rawFrom.search(/[?&#]/)
  if (tailIndex < 0) return { from: rawFrom, gluedQuery: {} }
  const gluedQuery: Record<string, string> = {}
  for (const [key, value] of new URLSearchParams(rawFrom.slice(tailIndex + 1))) {
    if (key && !(key in gluedQuery)) gluedQuery[key] = value
  }
  return { from: rawFrom.slice(0, tailIndex), gluedQuery }
}

// `from` as a referrer can trust: glued-on query stripped, `@` handle canonical,
// and undefined for an `@` handle that is not a valid Liker ID.
export function sanitizeFrom(rawFrom?: string): string | undefined {
  if (!rawFrom) return undefined
  const from = splitGluedFromQuery(rawFrom).from.trim()
  if (!from) return undefined
  if (!from.startsWith('@')) return from
  const likerId = getCanonicalLikerId(from)
  return checkLikerIdValid(likerId) ? formatLikerIdHandle(likerId) : undefined
}
