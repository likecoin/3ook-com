import { describe, expect, it } from 'vitest'

import { getIndexerNextKey } from '~~/shared/utils/indexer'

function makeResponse(itemCount: number, nextKey?: number) {
  return {
    data: Array.from({ length: itemCount }, (_, index) => ({ id: index })),
    pagination: { next_key: nextKey, count: 535 },
  }
}

describe('getIndexerNextKey', () => {
  it('keeps paginating on a full page with a real cursor', () => {
    expect(getIndexerNextKey(makeResponse(100, 100), 100)).toBe(100)
  })

  it('stops on a short page', () => {
    expect(getIndexerNextKey(makeResponse(35, 500), 100)).toBeUndefined()
  })

  it('stops when the indexer reports end-of-list as 0', () => {
    // 0 doubles as the start of the list, so honouring it would replay page 1.
    expect(getIndexerNextKey(makeResponse(100, 0), 100)).toBeUndefined()
  })

  it('stops when the cursor is absent', () => {
    expect(getIndexerNextKey(makeResponse(100), 100)).toBeUndefined()
    expect(getIndexerNextKey({ data: Array.from({ length: 100 }) }, 100)).toBeUndefined()
  })

  it('keeps paginating when a page overshoots the requested limit', () => {
    expect(getIndexerNextKey(makeResponse(120, 120), 100)).toBe(120)
  })
})
