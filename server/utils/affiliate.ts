import type { AffiliateConfig, AffiliateCustomVoice } from '~/server/types/affiliate'
import { getLikeCoinAPIFetch } from '~/shared/utils/api'
import { normalizeLikerId } from '~/shared/utils/liker-id'

type UpstreamAffiliateResponse =
  & Omit<AffiliateConfig, 'affiliateClassIds' | 'customVoices'>
  & {
    affiliateClassIds?: string[]
    customVoices?: Partial<AffiliateCustomVoice>[]
  }

const CACHE_TTL_MS = 5 * 60 * 1000
const NEGATIVE_CACHE_TTL_MS = 30 * 1000
const CACHE_MAX_ENTRIES = 500
const cache = new Map<string, { data: AffiliateConfig | null, expiresAt: number }>()

function isValidCustomVoice(voice: Partial<AffiliateCustomVoice>): voice is AffiliateCustomVoice {
  return typeof voice.id === 'string' && !!voice.id
    && typeof voice.name === 'string' && !!voice.name
    && typeof voice.providerVoiceId === 'string' && !!voice.providerVoiceId
}

export async function getAffiliateConfig(likerId: string): Promise<AffiliateConfig | null> {
  const key = normalizeLikerId(likerId)
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const upstream = await getLikeCoinAPIFetch()<UpstreamAffiliateResponse>(
    `/plus/affiliate/${encodeURIComponent(key)}`,
  ).catch(() => null)

  const data: AffiliateConfig | null = upstream?.active
    ? {
        active: true,
        affiliateClassIds: (upstream.affiliateClassIds ?? []).map(id => id.toLowerCase()),
        giftClassId: upstream.giftClassId,
        giftPriceIndex: upstream.giftPriceIndex,
        giftOnTrial: upstream.giftOnTrial,
        customVoices: (upstream.customVoices ?? []).filter(isValidCustomVoice),
      }
    : null

  // Bound the cache so unknown/spammed likerIds can't grow memory unboundedly.
  // FIFO eviction is sufficient; the Map preserves insertion order.
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) cache.delete(oldestKey)
  }
  // Cache negatives briefly so a transient upstream blip doesn't lock legit
  // affiliates out for the full positive TTL.
  const ttl = data ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS
  cache.set(key, { data, expiresAt: Date.now() + ttl })
  return data
}

export function isBookInAffiliateVoiceScope(config: AffiliateConfig, nftClassId: string): boolean {
  return config.affiliateClassIds.includes(nftClassId.toLowerCase())
}
