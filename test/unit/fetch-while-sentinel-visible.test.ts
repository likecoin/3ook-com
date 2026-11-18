import { describe, expect, it } from 'vitest'

import { fetchWhileSentinelVisible } from '~/utils/fetch-while-sentinel-visible'

// Each page lists the cursor it leaves and whether the sentinel is still visible after it renders.
function createListing(pages: Array<{ cursor?: string, isSentinelVisible?: boolean, ok?: boolean }>) {
  const state = { cursor: 'start' as string | undefined, fetches: 0 }
  return {
    state,
    options: {
      fetchPage: async () => {
        const page = pages[state.fetches++]
        if (!page || page.ok === false) return false
        state.cursor = page.cursor
        return true
      },
      getCursor: () => state.cursor,
      isSentinelStillVisible: async () => pages[state.fetches - 1]?.isSentinelVisible ?? false,
    },
  }
}

describe('fetchWhileSentinelVisible', () => {
  it('fetches once when the new page pushes the sentinel out of view', async () => {
    const { state, options } = createListing([{ cursor: 'p2' }])
    await fetchWhileSentinelVisible(options)
    expect(state.fetches).toBe(1)
  })

  it('advances past consecutive filtered pages that leave the sentinel visible', async () => {
    const { state, options } = createListing([
      { cursor: 'p2', isSentinelVisible: true },
      { cursor: 'p3', isSentinelVisible: true },
      { cursor: 'p4', isSentinelVisible: true },
      { cursor: 'p5' },
    ])
    const hasHitCap = await fetchWhileSentinelVisible(options)
    expect(state.fetches).toBe(4)
    expect(hasHitCap).toBe(false)
  })

  it('stops once the cursor is exhausted', async () => {
    const { state, options } = createListing([
      { cursor: 'p2', isSentinelVisible: true },
      { cursor: undefined, isSentinelVisible: true },
    ])
    await fetchWhileSentinelVisible(options)
    expect(state.fetches).toBe(2)
  })

  it('stops when a fetch fails', async () => {
    const { state, options } = createListing([
      { cursor: 'p2', isSentinelVisible: true },
      { ok: false },
      { cursor: 'p4' },
    ])
    await fetchWhileSentinelVisible(options)
    expect(state.fetches).toBe(2)
  })

  it('stops when the cursor repeats or cycles', async () => {
    const { state, options } = createListing([
      { cursor: 'p2', isSentinelVisible: true },
      { cursor: 'p3', isSentinelVisible: true },
      { cursor: 'p2', isSentinelVisible: true },
      { cursor: 'p4' },
    ])
    await fetchWhileSentinelVisible(options)
    expect(state.fetches).toBe(3)
  })

  it('stops at the page cap', async () => {
    const { state, options } = createListing(
      Array.from({ length: 10 }, (_, i) => ({ cursor: `p${i + 2}`, isSentinelVisible: true })),
    )
    const hasHitCap = await fetchWhileSentinelVisible({ ...options, maxPages: 3 })
    expect(state.fetches).toBe(3)
    expect(hasHitCap).toBe(true)
  })
})
