import { bytesToHex, hexToBytes } from 'viem'

export interface ShortLinkPayload {
  nftClassId: string
  priceIndex?: number
  likerId?: string
}

const ADDRESS_BYTE_LENGTH = 20
// 20 address bytes -> 27 unpadded base64url chars
const SHORT_LINK_CODE_LENGTH = Math.ceil(ADDRESS_BYTE_LENGTH * 4 / 3)
const SHORT_LINK_CODE_REGEX = new RegExp(`^[\\w-]{${SHORT_LINK_CODE_LENGTH}}$`)
const LIKER_ID_REGEX = /^[a-z0-9_-]+$/
const PRICE_INDEX_REGEX = /^[1-9]\d*$/

function encodeBytesToBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

function decodeBase64UrlToBytes(code: string): Uint8Array | null {
  try {
    const base64 = code.replaceAll('-', '+').replaceAll('_', '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const binary = atob(padded)
    return Uint8Array.from(binary, char => char.charCodeAt(0))
  }
  catch {
    return null
  }
}

// Short link code from an EVM address, lowercased first for determinism; '' if invalid.
export function encodeNFTClassAddress(nftClassId: string): string {
  if (!checkIsEVMAddress(nftClassId)) return ''
  return encodeBytesToBase64Url(hexToBytes(nftClassId.toLowerCase() as `0x${string}`))
}

// Lowercase address from a short link code; '' on any failure,
// including non-canonical codes that don't re-encode to themselves.
export function decodeNFTClassAddress(code: string): string {
  if (!SHORT_LINK_CODE_REGEX.test(code)) return ''
  const bytes = decodeBase64UrlToBytes(code)
  if (!bytes || bytes.length !== ADDRESS_BYTE_LENGTH) return ''
  if (encodeBytesToBase64Url(bytes) !== code) return ''
  return bytesToHex(bytes)
}

// Full path segment; '' if the address is invalid.
// Omits priceIndex <= 0 and invalid Liker IDs.
export function formatShortLinkSegment(payload: ShortLinkPayload): string {
  const code = encodeNFTClassAddress(payload.nftClassId)
  if (!code) return ''
  let segment = code
  if (Number.isInteger(payload.priceIndex) && (payload.priceIndex as number) > 0) {
    segment += `.${payload.priceIndex}`
  }
  if (payload.likerId) {
    const likerId = normalizeLikerId(payload.likerId).toLowerCase()
    if (LIKER_ID_REGEX.test(likerId)) {
      segment += `@${likerId}`
    }
  }
  return segment
}

// Strict inverse of formatShortLinkSegment; null on any violation.
export function parseShortLinkSegment(segment: string): ShortLinkPayload | null {
  const atParts = segment.split('@')
  if (atParts.length > 2) return null
  const [codeAndPrice = '', likerId] = atParts
  if (likerId !== undefined && !LIKER_ID_REGEX.test(likerId)) return null

  const dotParts = codeAndPrice.split('.')
  if (dotParts.length > 2) return null
  const [code = '', priceIndexString] = dotParts
  if (priceIndexString !== undefined && !PRICE_INDEX_REGEX.test(priceIndexString)) return null

  const nftClassId = decodeNFTClassAddress(code)
  if (!nftClassId) return null

  const payload: ShortLinkPayload = { nftClassId }
  if (priceIndexString !== undefined) payload.priceIndex = Number(priceIndexString)
  if (likerId !== undefined) payload.likerId = likerId
  return payload
}

// Resolve a segment into a relative redirect URL, or null when invalid.
// Query params pass through; segment values win; tracking defaults fill gaps.
export function resolveShortLinkRedirect(
  segment: string,
  incomingQuery: Record<string, string | string[] | undefined>,
  target: 'store' | 'library',
): string | null {
  const payload = parseShortLinkSegment(segment)
  if (!payload) return null

  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(incomingQuery)) {
    if (value === undefined) continue
    for (const item of Array.isArray(value) ? value : [value]) {
      searchParams.append(key, item)
    }
  }

  if (payload.priceIndex) {
    searchParams.set('price_index', String(payload.priceIndex))
  }
  else {
    searchParams.delete('price_index')
  }
  if (payload.likerId) {
    searchParams.set('from', formatLikerIdHandle(payload.likerId))
  }
  else {
    searchParams.delete('from')
  }

  if (!searchParams.has('utm_source')) searchParams.set('utm_source', 'short-link')
  if (!searchParams.has('utm_medium')) searchParams.set('utm_medium', 'social')
  if (!searchParams.has('utm_campaign')) searchParams.set('utm_campaign', 'share')

  return `/${target}/${payload.nftClassId}?${searchParams.toString()}`
}
