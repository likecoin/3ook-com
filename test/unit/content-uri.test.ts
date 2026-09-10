import { describe, expect, it } from 'vitest'

import { getThumbnailURL, normalizeContentURIToHTTP } from '~~/shared/utils/content-uri'

const ENDPOINTS = {
  arweaveEndpoint: 'https://arweave.net',
  ipfsEndpoint: 'https://ipfs.io/ipfs',
}

describe('normalizeContentURIToHTTP', () => {
  it('resolves the schemes the browser cannot fetch', () => {
    expect(normalizeContentURIToHTTP('ar://abc123', ENDPOINTS)).toBe('https://arweave.net/abc123')
    expect(normalizeContentURIToHTTP('ipfs://Qm123', ENDPOINTS)).toBe('https://ipfs.io/ipfs/Qm123')
  })

  it('passes an http(s) URL through untouched', () => {
    const url = 'https://static.like.co/cover.jpg?width=300'
    expect(normalizeContentURIToHTTP(url, ENDPOINTS)).toBe(url)
  })

  // The metadata field is optional upstream, so callers hand this whatever they have.
  it('returns an empty string for a missing URL', () => {
    expect(normalizeContentURIToHTTP(undefined, ENDPOINTS)).toBe('')
    expect(normalizeContentURIToHTTP('', ENDPOINTS)).toBe('')
  })

  // An unknown scheme is left alone rather than rewritten,
  // so the cover proxy's https check is what rejects it.
  it('leaves an unknown scheme for the caller to reject', () => {
    expect(normalizeContentURIToHTTP('data:image/png;base64,AAAA', ENDPOINTS)).toBe('data:image/png;base64,AAAA')
  })
})

describe('getThumbnailURL', () => {
  const likeCoinStaticEndpoint = 'https://static.like.co'

  it('wraps the image URL as an encoded query param', () => {
    expect(getThumbnailURL('https://arweave.net/a?b=c', { likeCoinStaticEndpoint })).toBe(
      'https://static.like.co/thumbnail/?url=https%3A%2F%2Farweave.net%2Fa%3Fb%3Dc',
    )
  })

  it('adds the width only when a size is given', () => {
    expect(getThumbnailURL('https://arweave.net/a', { likeCoinStaticEndpoint, size: 300 })).toBe(
      'https://static.like.co/thumbnail/?url=https%3A%2F%2Farweave.net%2Fa&width=300',
    )
  })

  it('returns an empty string rather than a thumbnail of nothing', () => {
    expect(getThumbnailURL('', { likeCoinStaticEndpoint, size: 300 })).toBe('')
  })
})
