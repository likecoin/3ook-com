import { describe, expect, it } from 'vitest'

import { sortNFTClassesByDatePublished } from '~~/shared/utils/indexer'

function makeClass(address: string, datePublished?: string) {
  return { address, metadata: { datePublished } } as NFTClass
}

function getAddresses(nftClasses: NFTClass[]) {
  return nftClasses.map(nftClass => nftClass.address)
}

describe('sortNFTClassesByDatePublished', () => {
  it('orders by publication date, newest first', () => {
    const sorted = sortNFTClassesByDatePublished([
      makeClass('a', '2019-03-01'),
      makeClass('b', '2026-11-01'),
      makeClass('c', '2024-06-15T00:00:00.000Z'),
    ])
    expect(getAddresses(sorted)).toEqual(['b', 'c', 'a'])
  })

  it('puts undated books last in their incoming order', () => {
    const sorted = sortNFTClassesByDatePublished([
      makeClass('undated-1'),
      makeClass('dated', '2020-01-01'),
      makeClass('invalid', 'not a date'),
      makeClass('undated-2', ''),
    ])
    expect(getAddresses(sorted)).toEqual(['dated', 'undated-1', 'invalid', 'undated-2'])
  })

  it('keeps incoming order for books published on the same date', () => {
    const sorted = sortNFTClassesByDatePublished([
      makeClass('first', '2026-11-01'),
      makeClass('second', '2026-11-01'),
    ])
    expect(getAddresses(sorted)).toEqual(['first', 'second'])
  })

  it('does not mutate the input', () => {
    const input = [makeClass('a', '2019-01-01'), makeClass('b', '2020-01-01')]
    sortNFTClassesByDatePublished(input)
    expect(getAddresses(input)).toEqual(['a', 'b'])
  })
})
