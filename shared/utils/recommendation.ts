import type { BookstoreCMSProduct } from '~~/shared/types/bookstore'

// Pure scoring logic for the personalized For You feed. IO (Firestore portrait
// reads, candidate pool fetches, caching) lives in server/utils/recommendation.ts;
// this file stays side-effect free so it can be unit tested directly.

// Minimum engaged/wishlisted books before the feed personalizes; below this the
// endpoint serves the popular list with isPersonalized=false.
export const FOR_YOU_MIN_SIGNAL_BOOKS = 3

// Books with derived weight below this don't count toward the cold-start signal.
const SIGNAL_WEIGHT_THRESHOLD = 0.5
const WISHLIST_PORTRAIT_WEIGHT = 2
const RECENCY_DECAY_DAYS = 60

const DIVERSITY_MAX_PER_AUTHOR = 3
const DIVERSITY_MAX_TOPIC_SHARE = 0.5

// Match weights. Curated signals (the seed's own recommendation list, an
// explicit wishlist) outrank inferred topical affinity; keywords sit lowest
// because they are the noisiest, and a candidate can match several at once.
const AUTHOR_MATCH_WEIGHT = 4
const SEED_RECOMMENDED_SCORE = 3
const GENRE_MATCH_WEIGHT = 3
const SEED_AFFINITY_SCORE = 2
const WISHLIST_SCORE = 2
const KEYWORD_MATCH_WEIGHT = 2
const PORTRAIT_RECOMMENDED_SCORE = 1.5
const TOP_LANGUAGE_MULTIPLIER = 1.2
// Priors decay by rank; the offset keeps even rank 0 below a real affinity match.
const POPULAR_PRIOR_WEIGHT = 1
const LATEST_PRIOR_WEIGHT = 0.5
const PRIOR_RANK_OFFSET = 10

// Bounds the per-wallet portrait cache entry; portrait books can each carry ~15
// recommendations.
const MAX_PORTRAIT_RECOMMENDED_BOOKS = 200

// Catalogue-wide boilerplate tags: every book (or most of one format) carries
// them, so they carry no discriminative signal and would otherwise dominate
// every portrait and pull back the whole catalogue as a "match".
const KEYWORD_STOPWORDS = new Set([
  '檔案下載',
  '档案下载',
  '電子書',
  '电子书',
  '站內閱讀',
  '站内阅读',
  'e-book',
  'ebook',
])

// Airtable flattens embedded newlines in author names to spaces, so the same
// author differs from the upstream metadata by whitespace alone. Affinity keys
// are compared exactly, so both sides must be normalized the same way.
function normalizeAffinityKey(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function getAffinity(map: Record<string, number>, key: string | undefined): number {
  if (!key) return 0
  return map[normalizeAffinityKey(key)] || 0
}

function getIsSameAffinityKey(a: string | undefined, b: string | undefined): boolean {
  return !!a && !!b && normalizeAffinityKey(a) === normalizeAffinityKey(b)
}

export function getCandidateClassId(product: BookstoreCMSProduct): string {
  return (product.classId || product.id || '').toLowerCase()
}

/**
 * Drops boilerplate and blank tags, and dedupes, so a keyword list is safe to
 * use as portrait affinity keys or as candidate pool search terms.
 */
export function filterMeaningfulKeywords(keywords: string[] | undefined): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const keyword of keywords || []) {
    const normalized = keyword?.trim()
    if (!normalized) continue
    const lowered = normalized.toLowerCase()
    if (KEYWORD_STOPWORDS.has(lowered) || seen.has(lowered)) continue
    seen.add(lowered)
    result.push(normalized)
  }
  return result
}

// `archivedAt` is deliberately absent: archiving is shelf tidying, applied to
// loved and abandoned books alike, so it reads as no taste signal either way.
export interface PortraitBookEntry {
  nftClassId: string
  totalReadingTimeMs?: number
  totalTTSListeningTimeMs?: number
  completedAtMs?: number
  didNotFinishAtMs?: number
  plusBorrowedAtMs?: number
  lastOpenedTimeMs?: number
  updatedAtMs?: number
}

export interface PortraitBookMetadata {
  genre?: string
  authorName?: string
  keywords?: string[]
  inLanguage?: string
  recommendedClassIds?: string[]
}

export interface UserAffinityPortrait {
  genres: Record<string, number>
  authors: Record<string, number>
  keywords: Record<string, number>
  languages: Record<string, number>
  engagedClassIds: string[]
  wishlistClassIds: string[]
  // Books explicitly recommended by books already in the portrait — a curated
  // co-read signal that costs no extra fetch, since it rides along on the
  // metadata already pulled for each portrait book.
  recommendedClassIds: string[]
  signalBookCount: number
}

export interface RecommendationCandidate {
  product: BookstoreCMSProduct
  isWishlisted?: boolean
  popularRank?: number
  latestRank?: number
}

export interface ScoredRecommendationCandidate extends RecommendationCandidate {
  score: number
}

/**
 * Engagement before recency decay. Whether a reader can be personalized is a
 * question about what they read, not when — so the signal count uses this,
 * while affinity uses the decayed weight below.
 */
export function computeBookEngagementStrength(entry: PortraitBookEntry): number {
  // An abandoned book is an explicit negative, so it must not push its own
  // author or genre up. Mutually exclusive with completedAt: marking a book
  // either way clears the other.
  if (entry.didNotFinishAtMs) return 0
  const readingMinutes = (entry.totalReadingTimeMs || 0) / 60000
  const ttsMinutes = (entry.totalTTSListeningTimeMs || 0) / 60000
  // log1p dampens whales so one binge-read book can't dominate the portrait.
  let strength = Math.log1p(readingMinutes + ttsMinutes)
  if (entry.completedAtMs) strength += 3
  if (entry.plusBorrowedAtMs) strength += 1
  return strength
}

function applyRecencyDecay(
  strength: number,
  entry: PortraitBookEntry,
  nowMs: number,
): number {
  const referenceMs = entry.lastOpenedTimeMs ?? entry.updatedAtMs
  if (!referenceMs) return strength
  const ageDays = Math.max(0, (nowMs - referenceMs) / 86400000)
  return strength * Math.exp(-ageDays / RECENCY_DECAY_DAYS)
}

export function computeBookEngagementWeight(
  entry: PortraitBookEntry,
  nowMs: number,
): number {
  return applyRecencyDecay(computeBookEngagementStrength(entry), entry, nowMs)
}

function addAffinity(map: Record<string, number>, key: string | undefined, weight: number) {
  if (!key || weight <= 0) return
  const normalized = normalizeAffinityKey(key)
  if (!normalized) return
  map[normalized] = (map[normalized] || 0) + weight
}

function normalizeAffinityMap(map: Record<string, number>): Record<string, number> {
  const total = Object.values(map).reduce((sum, value) => sum + value, 0)
  if (total <= 0) return {}
  return Object.fromEntries(Object.entries(map).map(([key, value]) => [key, value / total]))
}

export function getTopAffinityKeys(map: Record<string, number>, count: number): string[] {
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([key]) => key)
}

export function derivePortraitFromDocs(
  bookEntries: PortraitBookEntry[],
  wishlistClassIds: string[],
  metadataByClassId: Record<string, PortraitBookMetadata>,
  nowMs: number,
): UserAffinityPortrait {
  const genres: Record<string, number> = {}
  const authors: Record<string, number> = {}
  const keywords: Record<string, number> = {}
  const languages: Record<string, number> = {}
  const recommendedClassIds = new Set<string>()
  let signalBookCount = 0

  const engagedClassIds = bookEntries.map(entry => entry.nftClassId.toLowerCase())
  const normalizedWishlistClassIds = wishlistClassIds.map(id => id.toLowerCase())

  function addBookAffinity(metadata: PortraitBookMetadata, weight: number) {
    // addAffinity already ignores a non-positive weight, but the curated
    // recommendation list rides along outside it — an abandoned book must not
    // seed "readers of this also liked" either.
    if (weight <= 0) return
    addAffinity(genres, metadata.genre, weight)
    addAffinity(authors, metadata.authorName, weight)
    addAffinity(languages, metadata.inLanguage, weight)
    for (const classId of metadata.recommendedClassIds || []) {
      if (classId) recommendedClassIds.add(classId.toLowerCase())
    }
    // Split so a heavily tagged book doesn't outweigh a sparsely tagged one.
    const bookKeywords = filterMeaningfulKeywords(metadata.keywords)
    for (const keyword of bookKeywords) {
      addAffinity(keywords, keyword, weight / bookKeywords.length)
    }
  }

  for (const entry of bookEntries) {
    // Counted undecayed, weighted decayed: one number compounds the two
    // thresholds, putting even a finished book under the signal bar at ~107 days.
    // Wishlist entries below already count without decay.
    const strength = computeBookEngagementStrength(entry)
    if (strength >= SIGNAL_WEIGHT_THRESHOLD) signalBookCount += 1
    const metadata = metadataByClassId[entry.nftClassId.toLowerCase()]
    if (metadata) addBookAffinity(metadata, applyRecencyDecay(strength, entry, nowMs))
  }

  // Wishlisted books have no reading data, so they contribute a fixed weight.
  for (const classId of normalizedWishlistClassIds) {
    signalBookCount += 1
    const metadata = metadataByClassId[classId]
    if (metadata) addBookAffinity(metadata, WISHLIST_PORTRAIT_WEIGHT)
  }

  // A book the user already engaged with is not a recommendation.
  for (const classId of [...engagedClassIds, ...normalizedWishlistClassIds]) {
    recommendedClassIds.delete(classId)
  }

  return {
    genres: normalizeAffinityMap(genres),
    authors: normalizeAffinityMap(authors),
    keywords: normalizeAffinityMap(keywords),
    languages: normalizeAffinityMap(languages),
    engagedClassIds,
    wishlistClassIds: normalizedWishlistClassIds,
    recommendedClassIds: [...recommendedClassIds].slice(0, MAX_PORTRAIT_RECOMMENDED_BOOKS),
    signalBookCount,
  }
}

// Falls back to the first keyword because genre is unset on most of the
// catalogue, which would otherwise leave the share cap dead. Namespaced so a
// keyword can't collide with a genre of the same name.
function getCandidateTopic(product: BookstoreCMSProduct): string | undefined {
  if (product.genre) return `genre:${normalizeAffinityKey(product.genre)}`
  const [keyword] = product.keywords || []
  return keyword ? `keyword:${normalizeAffinityKey(keyword)}` : undefined
}

export function scoreCandidates(
  candidates: RecommendationCandidate[],
  portrait: UserAffinityPortrait,
  seedMetadata?: PortraitBookMetadata,
): ScoredRecommendationCandidate[] {
  const [topLanguage] = getTopAffinityKeys(portrait.languages, 1)
  const portraitRecommendedIds = new Set(portrait.recommendedClassIds)
  const seedRecommendedIds = new Set(
    (seedMetadata?.recommendedClassIds || []).map(id => id.toLowerCase()),
  )
  const seedKeywords = new Set(
    filterMeaningfulKeywords(seedMetadata?.keywords).map(keyword => normalizeAffinityKey(keyword)),
  )

  return candidates
    .map((candidate) => {
      const { product } = candidate
      const classId = getCandidateClassId(product)
      const keywords = product.keywords || []

      let score = 0
      score += AUTHOR_MATCH_WEIGHT * getAffinity(portrait.authors, product.authorName)
      score += GENRE_MATCH_WEIGHT * getAffinity(portrait.genres, product.genre)
      for (const keyword of keywords) {
        score += KEYWORD_MATCH_WEIGHT * getAffinity(portrait.keywords, keyword)
      }

      // Curated: the publisher/editor explicitly linked these books.
      if (seedRecommendedIds.has(classId)) score += SEED_RECOMMENDED_SCORE
      else if (portraitRecommendedIds.has(classId)) score += PORTRAIT_RECOMMENDED_SCORE

      if (candidate.isWishlisted) score += WISHLIST_SCORE

      // Shares a facet with the book being viewed, whichever pool surfaced it.
      const isSeedMatch = getIsSameAffinityKey(product.authorName, seedMetadata?.authorName)
        || getIsSameAffinityKey(product.genre, seedMetadata?.genre)
        || (seedKeywords.size > 0
          && keywords.some(keyword => seedKeywords.has(normalizeAffinityKey(keyword))))
      if (isSeedMatch) score += SEED_AFFINITY_SCORE

      if (candidate.popularRank !== undefined) {
        score += POPULAR_PRIOR_WEIGHT / (candidate.popularRank + PRIOR_RANK_OFFSET)
      }
      if (candidate.latestRank !== undefined) {
        score += LATEST_PRIOR_WEIGHT / (candidate.latestRank + PRIOR_RANK_OFFSET)
      }
      if (topLanguage && product.locales?.includes(topLanguage)) score *= TOP_LANGUAGE_MULTIPLIER
      return { ...candidate, score }
    })
    .sort((a, b) => b.score - a.score)
}

// Greedy pass: an item is deferred when its author already holds maxPerAuthor
// slots or its topic holds ≥ maxTopicShare of emitted slots; deferred items
// append after the pass so the list still fills.
export function applyDiversityGuard(
  sorted: ScoredRecommendationCandidate[],
  {
    maxPerAuthor = DIVERSITY_MAX_PER_AUTHOR,
    maxTopicShare = DIVERSITY_MAX_TOPIC_SHARE,
  } = {},
): ScoredRecommendationCandidate[] {
  const emitted: ScoredRecommendationCandidate[] = []
  const deferred: ScoredRecommendationCandidate[] = []
  const authorCounts: Record<string, number> = {}
  const topicCounts: Record<string, number> = {}
  for (const candidate of sorted) {
    const author = candidate.product.authorName && normalizeAffinityKey(candidate.product.authorName)
    const topic = getCandidateTopic(candidate.product)
    if (author && (authorCounts[author] || 0) >= maxPerAuthor) {
      deferred.push(candidate)
      continue
    }
    if (topic && emitted.length > 0 && (topicCounts[topic] || 0) >= emitted.length * maxTopicShare) {
      deferred.push(candidate)
      continue
    }
    if (author) authorCounts[author] = (authorCounts[author] || 0) + 1
    if (topic) topicCounts[topic] = (topicCounts[topic] || 0) + 1
    emitted.push(candidate)
  }
  return emitted.concat(deferred)
}
