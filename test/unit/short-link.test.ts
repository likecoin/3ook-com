import { describe, expect, it } from 'vitest'

import {
  decodeNFTClassAddress,
  encodeNFTClassAddress,
  formatShortLinkSegment,
  parseShortLinkSegment,
  resolveShortLinkRedirect,
} from '~~/shared/utils/short-link'

const ADDRESS_LOWERCASE = '0x1234567890abcdef1234567890abcdef12345678'
const ADDRESS_CHECKSUMMED = '0x1234567890AbcdEF1234567890aBcdef12345678'
const CODE = 'EjRWeJCrze8SNFZ4kKvN7xI0Vng'
// Same 20 bytes as CODE but with a spare trailing bit set
const NON_CANONICAL_CODE = 'EjRWeJCrze8SNFZ4kKvN7xI0Vnh'

describe('encodeNFTClassAddress', () => {
  it('encodes an address into a 27-char base64url code', () => {
    expect(encodeNFTClassAddress(ADDRESS_LOWERCASE)).toBe(CODE)
    expect(CODE).toHaveLength(27)
  })

  it('produces the same code regardless of input casing', () => {
    expect(encodeNFTClassAddress(ADDRESS_CHECKSUMMED)).toBe(CODE)
    expect(encodeNFTClassAddress(ADDRESS_LOWERCASE.toUpperCase().replace('0X', '0x'))).toBe(CODE)
  })

  it('returns empty string for non-EVM addresses', () => {
    expect(encodeNFTClassAddress('')).toBe('')
    expect(encodeNFTClassAddress('0x1234')).toBe('')
    expect(encodeNFTClassAddress('not-an-address')).toBe('')
  })
})

describe('decodeNFTClassAddress', () => {
  it('decodes a code into the lowercase address', () => {
    expect(decodeNFTClassAddress(CODE)).toBe(ADDRESS_LOWERCASE)
  })

  it('rejects codes with wrong length or charset', () => {
    expect(decodeNFTClassAddress('')).toBe('')
    expect(decodeNFTClassAddress(CODE.slice(0, 26))).toBe('')
    expect(decodeNFTClassAddress(`${CODE}A`)).toBe('')
    expect(decodeNFTClassAddress(`${CODE.slice(0, 26)}+`)).toBe('')
    expect(decodeNFTClassAddress(`${CODE.slice(0, 26)}.`)).toBe('')
  })

  it('rejects non-canonical codes with spare trailing bits set', () => {
    expect(decodeNFTClassAddress(NON_CANONICAL_CODE)).toBe('')
  })
})

describe('formatShortLinkSegment', () => {
  it('formats an address-only segment', () => {
    expect(formatShortLinkSegment({ nftClassId: ADDRESS_LOWERCASE })).toBe(CODE)
  })

  it('omits priceIndex when zero or invalid', () => {
    expect(formatShortLinkSegment({ nftClassId: ADDRESS_LOWERCASE, priceIndex: 0 })).toBe(CODE)
    expect(formatShortLinkSegment({ nftClassId: ADDRESS_LOWERCASE, priceIndex: -1 })).toBe(CODE)
    expect(formatShortLinkSegment({ nftClassId: ADDRESS_LOWERCASE, priceIndex: 1.5 })).toBe(CODE)
  })

  it('appends a positive priceIndex', () => {
    expect(formatShortLinkSegment({ nftClassId: ADDRESS_LOWERCASE, priceIndex: 3 })).toBe(`${CODE}.3`)
  })

  it('appends a normalized liker ID handle', () => {
    expect(formatShortLinkSegment({ nftClassId: ADDRESS_LOWERCASE, likerId: 'foo-bar_1' })).toBe(`${CODE}@foo-bar_1`)
    expect(formatShortLinkSegment({ nftClassId: ADDRESS_LOWERCASE, likerId: '@foo-bar_1' })).toBe(`${CODE}@foo-bar_1`)
  })

  it('formats priceIndex and liker ID together', () => {
    expect(formatShortLinkSegment({ nftClassId: ADDRESS_LOWERCASE, priceIndex: 2, likerId: 'alice' }))
      .toBe(`${CODE}.2@alice`)
  })

  it('lowercases mixed-case liker IDs', () => {
    expect(formatShortLinkSegment({ nftClassId: ADDRESS_LOWERCASE, likerId: 'AliceWong' })).toBe(`${CODE}@alicewong`)
  })

  it('drops invalid liker IDs', () => {
    expect(formatShortLinkSegment({ nftClassId: ADDRESS_LOWERCASE, likerId: 'foo!' })).toBe(CODE)
    expect(formatShortLinkSegment({ nftClassId: ADDRESS_LOWERCASE, likerId: '@' })).toBe(CODE)
  })

  it('returns empty string for an invalid address', () => {
    expect(formatShortLinkSegment({ nftClassId: 'not-an-address', priceIndex: 1, likerId: 'alice' })).toBe('')
  })
})

describe('parseShortLinkSegment', () => {
  it('parses every segment variant back to a payload', () => {
    expect(parseShortLinkSegment(CODE)).toEqual({ nftClassId: ADDRESS_LOWERCASE })
    expect(parseShortLinkSegment(`${CODE}.3`)).toEqual({ nftClassId: ADDRESS_LOWERCASE, priceIndex: 3 })
    expect(parseShortLinkSegment(`${CODE}@alice`)).toEqual({ nftClassId: ADDRESS_LOWERCASE, likerId: 'alice' })
    expect(parseShortLinkSegment(`${CODE}.2@foo-bar_1`))
      .toEqual({ nftClassId: ADDRESS_LOWERCASE, priceIndex: 2, likerId: 'foo-bar_1' })
  })

  it('roundtrips with formatShortLinkSegment', () => {
    const segment = formatShortLinkSegment({ nftClassId: ADDRESS_CHECKSUMMED, priceIndex: 5, likerId: '@bob' })
    expect(parseShortLinkSegment(segment)).toEqual({
      nftClassId: ADDRESS_LOWERCASE,
      priceIndex: 5,
      likerId: 'bob',
    })
  })

  it('rejects malformed segments', () => {
    expect(parseShortLinkSegment('')).toBeNull()
    expect(parseShortLinkSegment(CODE.slice(0, 26))).toBeNull()
    expect(parseShortLinkSegment(NON_CANONICAL_CODE)).toBeNull()
    expect(parseShortLinkSegment(`${CODE}.x2`)).toBeNull()
    expect(parseShortLinkSegment(`${CODE}.-1`)).toBeNull()
    expect(parseShortLinkSegment(`${CODE}.0`)).toBeNull()
    expect(parseShortLinkSegment(`${CODE}.1.2`)).toBeNull()
    expect(parseShortLinkSegment(`${CODE}@`)).toBeNull()
    expect(parseShortLinkSegment(`${CODE}@Alice`)).toBeNull()
    expect(parseShortLinkSegment(`${CODE}@a@b`)).toBeNull()
  })
})

describe('resolveShortLinkRedirect', () => {
  it('redirects to the store page with tracking defaults', () => {
    expect(resolveShortLinkRedirect(CODE, {}, 'store')).toBe(
      `/store/${ADDRESS_LOWERCASE}?utm_source=short-link&utm_medium=social&utm_campaign=share`,
    )
  })

  it('redirects to the library page', () => {
    expect(resolveShortLinkRedirect(CODE, {}, 'library')).toBe(
      `/library/${ADDRESS_LOWERCASE}?utm_source=short-link&utm_medium=social&utm_campaign=share`,
    )
  })

  it('includes price_index and from encoded in the segment', () => {
    const url = resolveShortLinkRedirect(`${CODE}.2@alice`, {}, 'store')
    const searchParams = new URL(url as string, 'https://3ook.com').searchParams
    expect(searchParams.get('price_index')).toBe('2')
    expect(searchParams.get('from')).toBe('@alice')
  })

  it('keeps incoming query params over tracking defaults', () => {
    const url = resolveShortLinkRedirect(CODE, { utm_source: 'threads' }, 'store')
    const searchParams = new URL(url as string, 'https://3ook.com').searchParams
    expect(searchParams.get('utm_source')).toBe('threads')
    expect(searchParams.get('utm_medium')).toBe('social')
    expect(searchParams.get('utm_campaign')).toBe('share')
  })

  it('prefers segment-encoded values over query duplicates', () => {
    const url = resolveShortLinkRedirect(`${CODE}.3@alice`, { price_index: '9', from: '@mallory' }, 'store')
    const searchParams = new URL(url as string, 'https://3ook.com').searchParams
    expect(searchParams.getAll('price_index')).toEqual(['3'])
    expect(searchParams.getAll('from')).toEqual(['@alice'])
  })

  it('drops a query price_index when the segment has none', () => {
    const url = resolveShortLinkRedirect(CODE, { price_index: '9' }, 'store')
    const searchParams = new URL(url as string, 'https://3ook.com').searchParams
    expect(searchParams.has('price_index')).toBe(false)
  })

  it('drops an injected query from when the segment has no liker ID', () => {
    const url = resolveShortLinkRedirect(CODE, { from: '@mallory' }, 'store')
    const searchParams = new URL(url as string, 'https://3ook.com').searchParams
    expect(searchParams.has('from')).toBe(false)
  })

  it('passes through unrelated query params including arrays', () => {
    const url = resolveShortLinkRedirect(CODE, { foo: ['a', 'b'], bar: 'c' }, 'store')
    const searchParams = new URL(url as string, 'https://3ook.com').searchParams
    expect(searchParams.getAll('foo')).toEqual(['a', 'b'])
    expect(searchParams.get('bar')).toBe('c')
  })

  it('returns null for invalid segments', () => {
    expect(resolveShortLinkRedirect('', {}, 'store')).toBeNull()
    expect(resolveShortLinkRedirect('garbage', {}, 'store')).toBeNull()
    expect(resolveShortLinkRedirect(NON_CANONICAL_CODE, {}, 'store')).toBeNull()
  })
})
