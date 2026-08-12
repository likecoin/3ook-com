import { bytesToHex, hexToBytes } from 'viem'

export interface ShortLinkPayload {
  nftClassId: string
  priceIndex?: number
  likerId?: string
  utmSource?: string
}

const ADDRESS_BYTE_LENGTH = 20
const MAX_LIKER_ID_LENGTH = 64
const LIKER_ID_REGEX = new RegExp(`^[a-z0-9_-]{1,${MAX_LIKER_ID_LENGTH}}$`)
const MAX_PRICE_INDEX = 255
// Flags byte + address + priceIndex byte + utm_source code byte
const MAX_PACKED_BYTE_LENGTH = 1 + ADDRESS_BYTE_LENGTH + 2
const MAX_PACKED_LENGTH = Math.ceil(MAX_PACKED_BYTE_LENGTH / 3) * 4
const PACKED_REGEX = new RegExp(`^[\\w-]{1,${MAX_PACKED_LENGTH}}$`)
const MAX_SLUG_LENGTH = MAX_PACKED_LENGTH + 1 + MAX_LIKER_ID_LENGTH

// Flag bits marking which optional bytes follow the address bytes
const FLAG_PRICE_INDEX = 1
const FLAG_UTM_SOURCE = 2
const KNOWN_FLAGS = FLAG_PRICE_INDEX | FLAG_UTM_SOURCE

// Single-byte utm_source codes
const CODE_BY_UTM_SOURCE: Record<string, string> = {
  'copy-link': 'c',
  'threads': 't',
  'facebook': 'f',
  'whatsapp': 'w',
  'x': 'x',
}
const UTM_SOURCE_BY_CODE = Object.fromEntries(
  Object.entries(CODE_BY_UTM_SOURCE).map(([source, code]) => [code, source]),
)

// Single-byte slug code for a utm_source; undefined for values not in the map,
// which should ride the query string instead
export function getUTMSourceCode(utmSource: string): string | undefined {
  return CODE_BY_UTM_SOURCE[utmSource]
}

// Chunked to stay clear of the engine's spread argument limit on large inputs
function convertBytesToBinaryString(bytes: Uint8Array): string {
  const CHUNK_SIZE = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE))
  }
  return binary
}

function encodeBytesToBase64URL(bytes: Uint8Array): string {
  return btoa(convertBytesToBinaryString(bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

function decodeBase64URLToBytes(packed: string): Uint8Array | null {
  try {
    const base64 = packed.replaceAll('-', '+').replaceAll('_', '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const binary = atob(padded)
    return Uint8Array.from(binary, char => char.charCodeAt(0))
  }
  catch {
    return null
  }
}

// Slug `<packed>[@<likerId>]`: packed is a base64url byte array of flags byte,
// 20 address bytes, then the flagged priceIndex and utm_source code bytes;
// the likerId rides as a readable handle since base64 would only inflate it.
// '' if the address is invalid; invalid optional fields are omitted.
export function formatShortLinkSlug(payload: ShortLinkPayload): string {
  if (!checkIsEVMAddress(payload.nftClassId)) return ''
  const addressBytes = hexToBytes(payload.nftClassId.toLowerCase() as `0x${string}`)

  let flags = 0
  const optionalBytes: number[] = []
  const { priceIndex, utmSource } = payload
  if (
    typeof priceIndex === 'number'
    && Number.isInteger(priceIndex)
    && priceIndex > 0
    && priceIndex <= MAX_PRICE_INDEX
  ) {
    flags |= FLAG_PRICE_INDEX
    optionalBytes.push(priceIndex)
  }
  const utmSourceCode = utmSource ? getUTMSourceCode(utmSource) : undefined
  if (utmSourceCode) {
    flags |= FLAG_UTM_SOURCE
    optionalBytes.push(utmSourceCode.charCodeAt(0))
  }

  const bytes = new Uint8Array(1 + addressBytes.length + optionalBytes.length)
  bytes[0] = flags
  bytes.set(addressBytes, 1)
  bytes.set(optionalBytes, 1 + addressBytes.length)
  let slug = encodeBytesToBase64URL(bytes)

  if (payload.likerId) {
    const likerId = normalizeLikerId(payload.likerId).toLowerCase()
    if (LIKER_ID_REGEX.test(likerId)) {
      slug += `@${likerId}`
    }
  }
  return slug
}

// Strict inverse of formatShortLinkSlug; null on any violation,
// including non-canonical slugs that don't re-format to themselves.
export function parseShortLinkSlug(segment: string): ShortLinkPayload | null {
  // Fail fast before split/decode can allocate on oversized input
  if (!segment || segment.length > MAX_SLUG_LENGTH) return null
  const atParts = segment.split('@')
  if (atParts.length > 2) return null
  const [packed = '', likerId] = atParts
  if (likerId !== undefined && !LIKER_ID_REGEX.test(likerId)) return null

  if (!PACKED_REGEX.test(packed)) return null
  const bytes = decodeBase64URLToBytes(packed)
  if (!bytes || bytes.length < 1 + ADDRESS_BYTE_LENGTH || bytes.length > MAX_PACKED_BYTE_LENGTH) return null

  const flags = bytes[0] ?? 0
  if (flags & ~KNOWN_FLAGS) return null

  const payload: ShortLinkPayload = {
    nftClassId: bytesToHex(bytes.subarray(1, 1 + ADDRESS_BYTE_LENGTH)),
  }
  let offset = 1 + ADDRESS_BYTE_LENGTH
  if (flags & FLAG_PRICE_INDEX) {
    if (offset >= bytes.length) return null
    payload.priceIndex = bytes[offset] ?? 0
    offset += 1
  }
  if (flags & FLAG_UTM_SOURCE) {
    if (offset >= bytes.length) return null
    const utmSource = UTM_SOURCE_BY_CODE[String.fromCharCode(bytes[offset] ?? 0)]
    if (!utmSource) return null
    payload.utmSource = utmSource
    offset += 1
  }
  if (offset !== bytes.length) return null
  if (likerId !== undefined) payload.likerId = likerId

  // Reject non-canonical slugs so the payload <-> slug mapping stays 1:1
  if (formatShortLinkSlug(payload) !== segment) return null
  return payload
}

// Resolve a slug into a relative redirect URL, or null when invalid.
// Query params pass through; slug values win; tracking defaults fill gaps.
export function resolveShortLinkRedirect(
  segment: string,
  incomingQuery: Record<string, string | string[] | undefined>,
  target: 'store' | 'library',
): string | null {
  const payload = parseShortLinkSlug(segment)
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
  if (payload.utmSource) {
    searchParams.set('utm_source', payload.utmSource)
  }

  if (!searchParams.has('utm_source')) searchParams.set('utm_source', 'short-link')
  if (!searchParams.has('utm_medium')) searchParams.set('utm_medium', 'social')
  if (!searchParams.has('utm_campaign')) searchParams.set('utm_campaign', 'share')

  return `/${target}/${payload.nftClassId}?${searchParams.toString()}`
}
