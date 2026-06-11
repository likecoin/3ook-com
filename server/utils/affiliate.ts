import type { AffiliateConfig, AffiliateCustomVoice } from '~~/server/types/affiliate'
import { fetchCachedNFTClassAggregatedMetadata } from '~~/server/utils/likecoin-nft'
import { checkIsEVMAddress, checksumEVMAddress, normalizeNFTClassId } from '~~/shared/utils'
import { getLikeCoinAPIFetch } from '~~/shared/utils/api'
import { normalizeLikerId } from '~~/shared/utils/liker-id'

type UpstreamAffiliateResponse =
  & Omit<AffiliateConfig, 'affiliateClassIds' | 'affiliatePublisherWallets' | 'customVoices'>
  & {
    affiliateClassIds?: string[]
    affiliatePublisherWallets?: string[]
    customVoices?: Partial<AffiliateCustomVoice>[]
    isPlusDiscountAllowed?: boolean
  }

type AffiliateEntry = {
  config: AffiliateConfig | null
  isPlusDiscountAllowed: boolean
}

const CACHE_TTL_MS = 5 * 60 * 1000
const NEGATIVE_CACHE_TTL_MS = 30 * 1000
const CACHE_MAX_ENTRIES = 500
const cache = new Map<string, { entry: AffiliateEntry | null, expiresAt: number }>()

function isValidCustomVoice(voice: Partial<AffiliateCustomVoice>): voice is AffiliateCustomVoice {
  return typeof voice.id === 'string' && !!voice.id
    && typeof voice.name === 'string' && !!voice.name
    && typeof voice.providerVoiceId === 'string' && !!voice.providerVoiceId
}

async function getAffiliateEntry(likerId: string): Promise<AffiliateEntry | null> {
  const key = normalizeLikerId(likerId)
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.entry

  const upstream = await getLikeCoinAPIFetch()<UpstreamAffiliateResponse>(
    `/plus/affiliate/${encodeURIComponent(key)}`,
  ).catch(() => null)

  const entry: AffiliateEntry | null = upstream
    ? {
        config: upstream.active
          ? {
              active: true,
              affiliateClassIds: (upstream.affiliateClassIds ?? []).map(id => id.toLowerCase()),
              affiliatePublisherWallets: (upstream.affiliatePublisherWallets ?? [])
                .map(w => checksumEVMAddress(w))
                .filter(Boolean),
              giftBooks: (upstream.giftBooks ?? [])
                .filter(b => typeof b?.classId === 'string' && !!b.classId)
                .map((b) => {
                  const priceIndex = Number(b.priceIndex)
                  return {
                    classId: normalizeNFTClassId(b.classId),
                    priceIndex: Number.isInteger(priceIndex) && priceIndex >= 0 ? priceIndex : 0,
                  }
                }),
              giftOnTrial: upstream.giftOnTrial,
              customVoices: (upstream.customVoices ?? []).filter(isValidCustomVoice),
            }
          : null,
        isPlusDiscountAllowed: !!upstream.isPlusDiscountAllowed,
      }
    : null

  // Bound the cache so unknown/spammed likerIds can't grow memory unboundedly.
  // Sweep expired entries first so short-TTL negatives don't evict valid positives;
  // fall back to FIFO (Map preserves insertion order) if we're still at capacity.
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const now = Date.now()
    for (const [k, v] of cache) {
      if (v.expiresAt <= now) cache.delete(k)
    }
    if (cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value
      if (oldestKey !== undefined) cache.delete(oldestKey)
    }
  }
  // Cache negatives briefly so a transient upstream blip — or a not-yet-active
  // affiliate flipping `active: true` — doesn't lock out for the full positive TTL.
  const ttl = entry?.config ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS
  cache.set(key, { entry, expiresAt: Date.now() + ttl })
  return entry
}

export async function getAffiliateConfig(likerId: string): Promise<AffiliateConfig | null> {
  return (await getAffiliateEntry(likerId))?.config ?? null
}

export async function getAffiliatePlusDiscountAllowed(likerId: string): Promise<boolean> {
  return (await getAffiliateEntry(likerId))?.isPlusDiscountAllowed ?? false
}

// A book is in scope when it is explicitly listed in `affiliateClassIds`, or
// when it is listed in the bookstore by one of the affiliate's publisher
// wallets — letting a publisher whitelist their wallet instead of each book.
export async function isBookInAffiliateVoiceScope(config: AffiliateConfig, nftClassId: string): Promise<boolean> {
  if (config.affiliateClassIds.includes(nftClassId.toLowerCase())) return true
  if (!config.affiliatePublisherWallets.length) return false
  // Only on-chain NFT class IDs can have bookstore metadata; skip uploaded-book
  // and preview IDs so we don't make guaranteed-failing upstream calls.
  if (!checkIsEVMAddress(nftClassId)) return false
  const metadata = await fetchCachedNFTClassAggregatedMetadata(nftClassId, ['bookstore'])
    .catch(() => null)
  const ownerWallet = checksumEVMAddress(metadata?.bookstoreInfo?.ownerWallet)
  return !!ownerWallet && config.affiliatePublisherWallets.includes(ownerWallet)
}
