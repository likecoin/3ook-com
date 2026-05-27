import { fetchCollectiveBookNFTs, type CollectiveBookNFTsQueryOptions } from '~~/shared/utils/collective-indexer'

import { StoreStakingBooksQuerySchema } from '~~/server/schemas/store'

type StakingSortBy = NonNullable<CollectiveBookNFTsQueryOptions['sort_by']>

const STAKING_SORT_BY_VALUES: StakingSortBy[] = ['staked_amount', 'last_staked_at', 'number_of_stakers']

function getFirstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

// Page-1 staking listings are public and identical for every user, so a shared
// SWR cache keeps the cross-origin indexer call off the SSR render path: past
// maxAge a render serves the cached payload and revalidates in the background
// (a cold key still blocks once). Per-instance with the default in-memory cache
// driver — mirrors `fetchCachedNFTClassAggregatedMetadata` in likecoin-nft.ts.
const fetchCachedTopStakingBookNFTs = defineCachedFunction(
  (sortBy: StakingSortBy, sortOrder: 'asc' | 'desc', limit: number) =>
    fetchCollectiveBookNFTs({
      'sort_by': sortBy,
      'sort_order': sortOrder,
      'pagination.limit': limit,
    }),
  {
    name: 'store-staking-books',
    group: 'store',
    swr: true,
    maxAge: 60, // seconds
    getKey: (sortBy, sortOrder, limit) => `${sortBy}:${sortOrder}:${limit}`,
  },
)

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, createValidator(StoreStakingBooksQuerySchema))

  const sortByRaw = getFirstQueryValue(query.sort_by)
  const sortBy: StakingSortBy = STAKING_SORT_BY_VALUES.includes(sortByRaw as StakingSortBy)
    ? (sortByRaw as StakingSortBy)
    : 'staked_amount'
  const sortOrder = getFirstQueryValue(query.sort_order) === 'asc' ? 'asc' : 'desc'
  const limit = Math.min(Math.max(1, Number(getFirstQueryValue(query.limit)) || 100), 100)
  const key = getFirstQueryValue(query.key)

  try {
    // Paginated cursors are short-lived and request-specific — fetch live and
    // never cache. Page 1 is shared and served through the SWR cache.
    if (key) {
      setHeader(event, 'cache-control', 'no-store')
      return await fetchCollectiveBookNFTs({
        'sort_by': sortBy,
        'sort_order': sortOrder,
        'pagination.limit': limit,
        'pagination.key': key,
      })
    }

    setHeader(event, 'cache-control', 'public, max-age=60, stale-while-revalidate=600')
    return await fetchCachedTopStakingBookNFTs(sortBy, sortOrder, limit)
  }
  catch (error) {
    console.error(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'UPSTREAM_ERROR',
    })
  }
})
