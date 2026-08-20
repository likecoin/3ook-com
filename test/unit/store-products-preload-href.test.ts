import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  fetchBookstoreCMSProductsByTagId,
  getBookstoreCMSProductsPreloadHref,
} from '~/utils/api'
import type { BookstoreCMSProductsQueryOptions } from '~/utils/api'
import { MAX_BOOKSTORE_PAGE_SIZE } from '~~/shared/utils/bookstore'

const TS = 1755000000

/**
 * The preload link in `app/pages/store/index.vue` only primes this fetch when the
 * two URLs match byte for byte, and a drift is silent — no error, just a preload
 * nothing reuses. So assert against the URL the fetch actually requests rather
 * than against the builder, which would be tautological.
 */
let requestedURL = ''
registerEndpoint('/api/store/products', (event) => {
  // @nuxt/test-utils mounts registered endpoints under `/_`; everything after
  // that prefix is the URL ofetch built.
  requestedURL = event.path.replace(/^\/_/, '')
  return { records: [], hasMore: false }
})

const CASES: [label: string, tagId: string, options: BookstoreCMSProductsQueryOptions][] = [
  ['a plain tag', 'latest', { ts: TS }],
  ['the library listing', 'latest', { ts: TS, isLibrary: true }],
  ['a tag needing percent-encoding', '測試 tag', { ts: TS }],
  ['no ts', 'latest', {}],
]

beforeEach(() => {
  requestedURL = ''
})

describe('store products preload href', () => {
  // Anchors the pair to a known-good string so they can't agree by both breaking.
  it('builds the documented preload URL', () => {
    expect(getBookstoreCMSProductsPreloadHref('latest', { ts: TS })).toBe(
      `/api/store/products?tag=latest&limit=${MAX_BOOKSTORE_PAGE_SIZE}&ts=${TS}`,
    )
  })

  it.each(CASES)('matches the fetched URL for %s', async (_label, tagId, options) => {
    await fetchBookstoreCMSProductsByTagId(tagId, options)
    expect(requestedURL).toBe(getBookstoreCMSProductsPreloadHref(tagId, options))
  })
})
