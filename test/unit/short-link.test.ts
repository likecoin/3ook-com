import { describe, expect, it } from 'vitest'

import {
  formatShortLinkSlug,
  parseShortLinkSlug,
  resolveShortLinkRedirect,
} from '~~/shared/utils/short-link'

const ADDRESS_LOWERCASE = '0x1234567890abcdef1234567890abcdef12345678'
const ADDRESS_CHECKSUMMED = '0x1234567890AbcdEF1234567890aBcdef12345678'
const ADDRESS_BYTES = [0x12, 0x34, 0x56, 0x78, 0x90, 0xAB, 0xCD, 0xEF, 0x12, 0x34, 0x56, 0x78, 0x90, 0xAB, 0xCD, 0xEF, 0x12, 0x34, 0x56, 0x78]

// Test-only encoder for crafting malformed packed parts byte by byte
function encodeTestPacked(bytes: number[]): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

describe('formatShortLinkSlug', () => {
  it('encodes an address-only payload into a packed base64url slug', () => {
    const slug = formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE })
    expect(slug).toBe(encodeTestPacked([0, ...ADDRESS_BYTES]))
    expect(slug).toMatch(/^[\w-]+$/)
  })

  it('produces the same slug regardless of address casing', () => {
    const slug = formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE })
    expect(formatShortLinkSlug({ nftClassId: ADDRESS_CHECKSUMMED })).toBe(slug)
  })

  it('appends the liker ID as a readable handle outside the packed part', () => {
    const slug = formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE })
    expect(formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE, likerId: 'alice' })).toBe(`${slug}@alice`)
  })

  it('omits priceIndex when zero, negative, fractional or out of range', () => {
    const slug = formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE })
    expect(formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE, priceIndex: 0 })).toBe(slug)
    expect(formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE, priceIndex: -1 })).toBe(slug)
    expect(formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE, priceIndex: 1.5 })).toBe(slug)
    expect(formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE, priceIndex: 256 })).toBe(slug)
  })

  it('normalizes and lowercases the liker ID', () => {
    expect(formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE, likerId: '@AliceWong' }))
      .toBe(formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE, likerId: 'alicewong' }))
  })

  it('drops invalid liker IDs and unknown utm_source values', () => {
    const slug = formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE })
    expect(formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE, likerId: 'foo!' })).toBe(slug)
    expect(formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE, likerId: '@' })).toBe(slug)
    expect(formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE, likerId: 'a'.repeat(65) })).toBe(slug)
    expect(formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE, utmSource: 'unknown' })).toBe(slug)
  })

  it('returns empty string for an invalid address', () => {
    expect(formatShortLinkSlug({ nftClassId: '' })).toBe('')
    expect(formatShortLinkSlug({ nftClassId: '0x1234' })).toBe('')
    expect(formatShortLinkSlug({ nftClassId: 'not-an-address', priceIndex: 1, likerId: 'alice' })).toBe('')
  })
})

describe('parseShortLinkSlug', () => {
  it('roundtrips every payload variant', () => {
    const variants: Parameters<typeof formatShortLinkSlug>[0][] = [
      { nftClassId: ADDRESS_LOWERCASE },
      { nftClassId: ADDRESS_LOWERCASE, priceIndex: 3 },
      { nftClassId: ADDRESS_LOWERCASE, likerId: 'foo-bar_1' },
      { nftClassId: ADDRESS_LOWERCASE, utmSource: 'threads' },
      { nftClassId: ADDRESS_LOWERCASE, priceIndex: 255, likerId: 'alice', utmSource: 'copy-link' },
    ]
    for (const payload of variants) {
      expect(parseShortLinkSlug(formatShortLinkSlug(payload))).toEqual(payload)
    }
  })

  it('returns the lowercase address from a checksummed input', () => {
    const slug = formatShortLinkSlug({ nftClassId: ADDRESS_CHECKSUMMED })
    expect(parseShortLinkSlug(slug)?.nftClassId).toBe(ADDRESS_LOWERCASE)
  })

  it('rejects malformed slugs', () => {
    const packed = encodeTestPacked([0, ...ADDRESS_BYTES])
    expect(parseShortLinkSlug('')).toBeNull()
    expect(parseShortLinkSlug('garbage!')).toBeNull()
    // Oversized input must be rejected up front, before split or decode
    expect(parseShortLinkSlug('A'.repeat(100_000))).toBeNull()
    expect(parseShortLinkSlug('@'.repeat(100_000))).toBeNull()
    // Too short: flags byte + 19 address bytes
    expect(parseShortLinkSlug(encodeTestPacked([0, ...ADDRESS_BYTES.slice(0, 19)]))).toBeNull()
    // Unknown flag bits
    expect(parseShortLinkSlug(encodeTestPacked([4, ...ADDRESS_BYTES]))).toBeNull()
    expect(parseShortLinkSlug(encodeTestPacked([8, ...ADDRESS_BYTES]))).toBeNull()
    // Price index flag set but no byte follows
    expect(parseShortLinkSlug(encodeTestPacked([1, ...ADDRESS_BYTES]))).toBeNull()
    // Non-canonical: price index flag set with value 0 (format omits zero)
    expect(parseShortLinkSlug(encodeTestPacked([1, ...ADDRESS_BYTES, 0]))).toBeNull()
    // Unknown utm_source code byte
    expect(parseShortLinkSlug(encodeTestPacked([2, ...ADDRESS_BYTES, 'z'.charCodeAt(0)]))).toBeNull()
    // Trailing bytes without a flag to claim them
    expect(parseShortLinkSlug(encodeTestPacked([0, ...ADDRESS_BYTES, 1]))).toBeNull()
    // Invalid handle part
    expect(parseShortLinkSlug(`${packed}@`)).toBeNull()
    expect(parseShortLinkSlug(`${packed}@Alice`)).toBeNull()
    expect(parseShortLinkSlug(`${packed}@foo!`)).toBeNull()
    expect(parseShortLinkSlug(`${packed}@${'a'.repeat(65)}`)).toBeNull()
    expect(parseShortLinkSlug(`${packed}@a@b`)).toBeNull()
  })

  it('rejects slugs with spare base64 trailing bits set', () => {
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    // 22-byte packed part -> the last base64 char leaves 4 spare bits; setting
    // one decodes to the same bytes but must be rejected as non-canonical
    const slug = formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE, priceIndex: 3 })
    const lastCharIndex = ALPHABET.indexOf(slug.at(-1) as string)
    const tweaked = `${slug.slice(0, -1)}${ALPHABET[lastCharIndex + 1]}`
    expect(parseShortLinkSlug(tweaked)).toBeNull()
  })
})

describe('resolveShortLinkRedirect', () => {
  const SLUG = formatShortLinkSlug({ nftClassId: ADDRESS_LOWERCASE })
  const FULL_SLUG = formatShortLinkSlug({
    nftClassId: ADDRESS_LOWERCASE,
    priceIndex: 2,
    likerId: 'alice',
    utmSource: 'threads',
  })

  it('redirects to the store page with tracking defaults', () => {
    expect(resolveShortLinkRedirect(SLUG, {}, 'store')).toBe(
      `/store/${ADDRESS_LOWERCASE}?utm_source=short-link&utm_medium=social&utm_campaign=share`,
    )
  })

  it('redirects to the library page', () => {
    expect(resolveShortLinkRedirect(SLUG, {}, 'library')).toBe(
      `/library/${ADDRESS_LOWERCASE}?utm_source=short-link&utm_medium=social&utm_campaign=share`,
    )
  })

  it('emits price_index, from and utm_source encoded in the slug', () => {
    const url = resolveShortLinkRedirect(FULL_SLUG, {}, 'store')
    const searchParams = new URL(url as string, 'https://3ook.com').searchParams
    expect(searchParams.get('price_index')).toBe('2')
    expect(searchParams.get('from')).toBe('@alice')
    expect(searchParams.get('utm_source')).toBe('threads')
    expect(searchParams.get('utm_medium')).toBe('social')
    expect(searchParams.get('utm_campaign')).toBe('share')
  })

  it('prefers slug-encoded values over query duplicates', () => {
    const url = resolveShortLinkRedirect(
      FULL_SLUG,
      { price_index: '9', from: '@mallory', utm_source: 'spoofed' },
      'store',
    )
    const searchParams = new URL(url as string, 'https://3ook.com').searchParams
    expect(searchParams.getAll('price_index')).toEqual(['2'])
    expect(searchParams.getAll('from')).toEqual(['@alice'])
    expect(searchParams.getAll('utm_source')).toEqual(['threads'])
  })

  it('passes through a query utm_source when the slug has none', () => {
    const url = resolveShortLinkRedirect(SLUG, { utm_source: 'instagram' }, 'store')
    const searchParams = new URL(url as string, 'https://3ook.com').searchParams
    expect(searchParams.get('utm_source')).toBe('instagram')
  })

  it('drops injected price_index and from when the slug has none', () => {
    const url = resolveShortLinkRedirect(SLUG, { price_index: '9', from: '@mallory' }, 'store')
    const searchParams = new URL(url as string, 'https://3ook.com').searchParams
    expect(searchParams.has('price_index')).toBe(false)
    expect(searchParams.has('from')).toBe(false)
  })

  it('passes through unrelated query params including arrays', () => {
    const url = resolveShortLinkRedirect(SLUG, { foo: ['a', 'b'], bar: 'c' }, 'store')
    const searchParams = new URL(url as string, 'https://3ook.com').searchParams
    expect(searchParams.getAll('foo')).toEqual(['a', 'b'])
    expect(searchParams.get('bar')).toBe('c')
  })

  it('returns null for invalid slugs', () => {
    expect(resolveShortLinkRedirect('', {}, 'store')).toBeNull()
    expect(resolveShortLinkRedirect('garbage!', {}, 'store')).toBeNull()
  })
})
