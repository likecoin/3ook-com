import { describe, expect, it } from 'vitest'
import { stripRecommendationMetadata } from '~~/server/utils/bookstore'
import type { BookstoreCMSProduct } from '~~/shared/types/bookstore'

function makeProduct(overrides: Partial<BookstoreCMSProduct> = {}): BookstoreCMSProduct {
  return {
    id: '0x1',
    classId: '0x1',
    title: 'Book',
    isDRMFree: false,
    genre: 'Fiction',
    authorName: 'Alice',
    keywords: ['space', 'ai'],
    ...overrides,
  }
}

describe('stripRecommendationMetadata', () => {
  it('removes the scorer-only fields from every record', () => {
    const { records } = stripRecommendationMetadata({ records: [makeProduct(), makeProduct({ id: '0x2' })] })
    expect(records).toHaveLength(2)
    for (const record of records) {
      expect(record).not.toHaveProperty('genre')
      expect(record).not.toHaveProperty('authorName')
      expect(record).not.toHaveProperty('keywords')
    }
  })

  it('preserves rendered fields and the pagination envelope', () => {
    const result = stripRecommendationMetadata({
      records: [makeProduct({ minPrice: 42 })],
      offset: 'cursor',
      hasMore: true,
    })
    expect(result.offset).toBe('cursor')
    expect(result.hasMore).toBe(true)
    expect(result.records[0]).toMatchObject({ id: '0x1', title: 'Book', minPrice: 42, isDRMFree: false })
  })

  it('does not mutate the source records, which come from shared caches', () => {
    const product = makeProduct()
    stripRecommendationMetadata({ records: [product] })
    expect(product.keywords).toEqual(['space', 'ai'])
    expect(product.authorName).toBe('Alice')
  })
})
