import type { LikeCoinNFTClassAggregatedMetadataOptionKey } from '~~/shared/utils/api'
import { fetchLikeCoinNFTClassAggregatedMetadataById } from '~~/shared/utils/api'

// Aggregated NFT metadata is book-level, not session-scoped, so a shared cache
// is safe and does not affect per-user rendering. Stale-while-revalidate keeps
// the upstream call off the SSR render path: past maxAge a render serves the
// cached payload and revalidates in the background (a cold key still blocks
// once). With the default in-memory cache driver this is per-instance — a
// shared driver would be needed for global collapsing under scale-out.
export const fetchCachedNFTClassAggregatedMetadata = defineCachedFunction(
  (nftClassId: string, dataOptions: LikeCoinNFTClassAggregatedMetadataOptionKey[]) =>
    fetchLikeCoinNFTClassAggregatedMetadataById(nftClassId, { include: dataOptions }),
  {
    name: 'likecoin-nft',
    group: 'likecoin-nft',
    swr: true,
    maxAge: 60, // seconds
    getKey: (nftClassId, dataOptions) =>
      `${nftClassId.toLowerCase()}:${[...dataOptions].sort().join(',')}`,
  },
)
