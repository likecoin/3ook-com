import { describe, expect, it } from 'vitest'
import {
  FOR_YOU_MIN_SIGNAL_BOOKS,
  applyDiversityGuard,
  computeBookEngagementWeight,
  derivePortraitFromDocs,
  filterMeaningfulKeywords,
  getIsSignalBook,
  getTopAffinityKeys,
  scoreCandidates,
} from '~~/shared/utils/recommendation'
import type {
  PortraitBookEntry,
  RecommendationCandidate,
  ScoredRecommendationCandidate,
  UserAffinityPortrait,
} from '~~/shared/utils/recommendation'
import type { BookstoreCMSProduct } from '~~/shared/types/bookstore'

const NOW = 1_700_000_000_000
const DAY_MS = 86_400_000

function makeEntry(overrides: Partial<PortraitBookEntry> = {}): PortraitBookEntry {
  return {
    nftClassId: '0xAAA',
    totalReadingTimeMs: 30 * 60_000, // 30 minutes
    lastOpenedTimeMs: NOW,
    ...overrides,
  }
}

function makePortrait(overrides: Partial<UserAffinityPortrait> = {}): UserAffinityPortrait {
  return {
    genres: {},
    authors: {},
    keywords: {},
    languages: {},
    engagedClassIds: [],
    wishlistClassIds: [],
    recommendedClassIds: [],
    signalBookCount: FOR_YOU_MIN_SIGNAL_BOOKS,
    ...overrides,
  }
}

function makeCandidate(
  classId: string,
  { product, ...overrides }: Partial<RecommendationCandidate> & {
    product?: Partial<BookstoreCMSProduct>
  } = {},
): RecommendationCandidate {
  return {
    product: { id: classId, classId, isDRMFree: false, ...product },
    ...overrides,
  }
}

describe('computeBookEngagementWeight', () => {
  it('log-dampens reading time so a binge cannot dominate', () => {
    const short = computeBookEngagementWeight(makeEntry({ totalReadingTimeMs: 30 * 60_000 }), NOW)
    const long = computeBookEngagementWeight(makeEntry({ totalReadingTimeMs: 3_000 * 60_000 }), NOW)
    expect(long).toBeGreaterThan(short)
    // 100× the reading time yields far less than 100× the weight.
    expect(long / short).toBeLessThan(5)
  })

  it('counts TTS listening time like reading time', () => {
    const reading = computeBookEngagementWeight(makeEntry({ totalReadingTimeMs: 60 * 60_000 }), NOW)
    const tts = computeBookEngagementWeight(
      makeEntry({ totalReadingTimeMs: 0, totalTTSListeningTimeMs: 60 * 60_000 }),
      NOW,
    )
    expect(tts).toBe(reading)
  })

  it('boosts completed and borrowed books', () => {
    const base = computeBookEngagementWeight(makeEntry(), NOW)
    const completed = computeBookEngagementWeight(makeEntry({ completedAtMs: NOW }), NOW)
    const borrowed = computeBookEngagementWeight(makeEntry({ plusBorrowedAtMs: NOW }), NOW)
    expect(completed).toBeCloseTo(base + 3)
    expect(borrowed).toBeCloseTo(base + 1)
  })

  it('drops did-not-finish books to zero weight', () => {
    expect(computeBookEngagementWeight(makeEntry({ didNotFinishAtMs: NOW }), NOW)).toBe(0)
    // Even a book that was read at length before being abandoned.
    expect(computeBookEngagementWeight(
      makeEntry({ didNotFinishAtMs: NOW, totalReadingTimeMs: 600 * 60000 }),
      NOW,
    )).toBe(0)
  })

  it('decays with time since last opened', () => {
    const fresh = computeBookEngagementWeight(makeEntry({ lastOpenedTimeMs: NOW }), NOW)
    const stale = computeBookEngagementWeight(
      makeEntry({ lastOpenedTimeMs: NOW - 120 * DAY_MS }),
      NOW,
    )
    expect(stale).toBeLessThan(fresh)
    expect(stale).toBeGreaterThan(0)
  })
})

describe('getIsSignalBook', () => {
  // The gate the cold-start feed turns on, settled from Firestore docs alone —
  // so it must agree with what derivePortraitFromDocs counts.
  it('clears the bar at roughly 40 seconds of reading', () => {
    expect(getIsSignalBook(makeEntry({ totalReadingTimeMs: 20_000 }))).toBe(false)
    expect(getIsSignalBook(makeEntry({ totalReadingTimeMs: 60_000 }))).toBe(true)
  })

  it('counts an abandoned book as no signal however long it was read', () => {
    expect(getIsSignalBook(
      makeEntry({ totalReadingTimeMs: 600 * 60_000, didNotFinishAtMs: NOW }),
    )).toBe(false)
  })

  it('counts a barely-read book that was completed or borrowed', () => {
    expect(getIsSignalBook(makeEntry({ totalReadingTimeMs: 0, completedAtMs: NOW }))).toBe(true)
    expect(getIsSignalBook(makeEntry({ totalReadingTimeMs: 0, plusBorrowedAtMs: NOW }))).toBe(true)
  })

  it('does not decay, so an old book still counts toward the gate', () => {
    expect(getIsSignalBook(
      makeEntry({ totalReadingTimeMs: 60 * 60_000, lastOpenedTimeMs: NOW - 400 * DAY_MS }),
    )).toBe(true)
  })

  it('agrees with the count derivePortraitFromDocs reports', () => {
    const entries = [
      makeEntry({ nftClassId: '0xaaa', totalReadingTimeMs: 60_000 }),
      makeEntry({ nftClassId: '0xbbb', totalReadingTimeMs: 20_000 }),
      makeEntry({ nftClassId: '0xccc', totalReadingTimeMs: 600 * 60_000, didNotFinishAtMs: NOW }),
    ]
    const wishlist = ['0xddd']
    const portrait = derivePortraitFromDocs(entries, wishlist, {}, NOW)
    expect(entries.filter(getIsSignalBook).length + wishlist.length)
      .toBe(portrait.signalBookCount)
  })
})

describe('derivePortraitFromDocs', () => {
  const metadata = {
    '0xaaa': { genre: 'sci-fi', authorName: 'Alice', keywords: ['space', 'ai'], inLanguage: 'zh' },
    '0xbbb': { genre: 'romance', authorName: 'Bob', inLanguage: 'en' },
    '0xccc': { genre: 'sci-fi', authorName: 'Alice', inLanguage: 'zh' },
  }

  it('normalizes each affinity map to sum 1', () => {
    const portrait = derivePortraitFromDocs(
      [makeEntry({ nftClassId: '0xAAA' }), makeEntry({ nftClassId: '0xBBB' })],
      ['0xCCC'],
      metadata,
      NOW,
    )
    const total = (map: Record<string, number>) =>
      Object.values(map).reduce((sum, value) => sum + value, 0)
    expect(total(portrait.genres)).toBeCloseTo(1)
    expect(total(portrait.authors)).toBeCloseTo(1)
    expect(total(portrait.languages)).toBeCloseTo(1)
    expect(portrait.genres['sci-fi']).toBeGreaterThan(portrait.genres.romance!)
  })

  it('lowercases engaged and wishlist class ids', () => {
    const portrait = derivePortraitFromDocs(
      [makeEntry({ nftClassId: '0xAAA' })],
      ['0xBBB'],
      metadata,
      NOW,
    )
    expect(portrait.engagedClassIds).toEqual(['0xaaa'])
    expect(portrait.wishlistClassIds).toEqual(['0xbbb'])
  })

  it('counts engaged books and wishlist entries toward the cold-start signal', () => {
    const portrait = derivePortraitFromDocs(
      [makeEntry({ nftClassId: '0xAAA' }), makeEntry({ nftClassId: '0xBBB', totalReadingTimeMs: 0, lastOpenedTimeMs: undefined })],
      ['0xCCC'],
      metadata,
      NOW,
    )
    // The zero-engagement book contributes no signal; wishlist entries always do.
    expect(portrait.signalBookCount).toBe(2)
  })

  it('counts a lapsed reader\'s books toward the signal but decays their affinity', () => {
    const lastYear = { lastOpenedTimeMs: NOW - 300 * DAY_MS, completedAtMs: NOW - 300 * DAY_MS }
    const portrait = derivePortraitFromDocs(
      [
        makeEntry({ nftClassId: '0xAAA', ...lastYear }),
        makeEntry({ nftClassId: '0xBBB', ...lastYear }),
        makeEntry({ nftClassId: '0xCCC', ...lastYear }),
      ],
      [],
      metadata,
      NOW,
    )
    // Decayed weight is far under SIGNAL_WEIGHT_THRESHOLD, which used to strand
    // these readers on the cold-start list despite three finished books.
    expect(computeBookEngagementWeight(makeEntry(lastYear), NOW)).toBeLessThan(0.5)
    expect(portrait.signalBookCount).toBe(3)
    // Affinity still normalizes, so the ranking sees the same proportions a
    // recent reader of the same books would produce.
    expect(Object.values(portrait.genres).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1)
  })

  it('builds keyword affinity from engaged and wishlisted books', () => {
    const portrait = derivePortraitFromDocs(
      [makeEntry({ nftClassId: '0xAAA' })],
      ['0xEEE'],
      { ...metadata, '0xeee': { keywords: ['space'] } },
      NOW,
    )
    // '0xaaa' splits its weight across two keywords; the wishlist entry puts all
    // of its fixed weight on 'space', so 'space' outweighs 'ai'.
    expect(portrait.keywords.space).toBeGreaterThan(portrait.keywords.ai!)
    expect(Object.values(portrait.keywords).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1)
  })

  it('drops catalogue-wide boilerplate keywords from the portrait', () => {
    const portrait = derivePortraitFromDocs(
      [makeEntry({ nftClassId: '0xFFF' })],
      [],
      { '0xfff': { keywords: ['電子書', 'ebook', '站內閱讀', '武俠'] } },
      NOW,
    )
    // Boilerplate is on every book, so it would otherwise swamp the one real tag.
    expect(portrait.keywords).toEqual({ 武俠: 1 })
  })

  it('collects recommended class ids from portrait books, excluding ones already read', () => {
    const portrait = derivePortraitFromDocs(
      [makeEntry({ nftClassId: '0xAAA' })],
      ['0xBBB'],
      {
        '0xaaa': { recommendedClassIds: ['0xEEE', '0xBBB', '0xAAA'] },
        '0xbbb': { recommendedClassIds: ['0xFFF'] },
      },
      NOW,
    )
    // Lowercased; the wishlisted 0xbbb and the already-engaged 0xaaa drop out.
    expect([...portrait.recommendedClassIds].sort()).toEqual(['0xeee', '0xfff'])
  })

  it('skips affinity for books without metadata but keeps them excluded', () => {
    const portrait = derivePortraitFromDocs(
      [makeEntry({ nftClassId: '0xDDD' })],
      [],
      metadata,
      NOW,
    )
    expect(portrait.genres).toEqual({})
    expect(portrait.engagedClassIds).toEqual(['0xddd'])
  })
})

describe('scoreCandidates', () => {
  it('ranks author and genre matches above popularity priors', () => {
    const portrait = makePortrait({
      genres: { 'sci-fi': 1 },
      authors: { Alice: 1 },
    })
    const scored = scoreCandidates([
      makeCandidate('0x1', { popularRank: 0 }),
      makeCandidate('0x2', { product: { genre: 'sci-fi' } }),
      makeCandidate('0x3', { product: { authorName: 'Alice' } }),
    ], portrait)
    expect(scored.map(candidate => candidate.product.classId)).toEqual(['0x3', '0x2', '0x1'])
  })

  it('matches an author whose whitespace differs between sources', () => {
    // Airtable flattens embedded newlines to spaces; the upstream metadata keeps them.
    const portrait = derivePortraitFromDocs(
      [makeEntry({ nftClassId: '0xAAA' })],
      [],
      { '0xaaa': { authorName: 'Ortega y Gasset\n馬楠 譯' } },
      NOW,
    )
    const [scored] = scoreCandidates(
      [makeCandidate('0x1', { product: { authorName: 'Ortega y Gasset 馬楠 譯' } })],
      portrait,
    )
    expect(scored!.score).toBeCloseTo(4)
  })

  it('ranks keyword matches below genre and author but above popularity priors', () => {
    const portrait = makePortrait({
      genres: { 'sci-fi': 1 },
      authors: { Alice: 1 },
      keywords: { space: 1 },
    })
    const scored = scoreCandidates([
      makeCandidate('0x1', { popularRank: 0 }),
      makeCandidate('0x2', { product: { keywords: ['space'] } }),
      makeCandidate('0x3', { product: { genre: 'sci-fi' } }),
      makeCandidate('0x4', { product: { authorName: 'Alice' } }),
    ], portrait)
    expect(scored.map(candidate => candidate.product.classId)).toEqual(['0x4', '0x3', '0x2', '0x1'])
  })

  it('accumulates every matched keyword and ignores unmatched ones', () => {
    const portrait = makePortrait({ keywords: { space: 0.5, ai: 0.3 } })
    const scored = scoreCandidates([
      makeCandidate('0x1', { product: { keywords: ['space'] } }),
      makeCandidate('0x2', { product: { keywords: ['space', 'ai', '電子書'] } }),
    ], portrait)
    expect(scored[0]!.product.classId).toBe('0x2')
    expect(scored[0]!.score).toBeCloseTo(2 * 0.5 + 2 * 0.3)
  })

  it('boosts wishlisted candidates', () => {
    const scored = scoreCandidates([
      makeCandidate('0x1'),
      makeCandidate('0x2', { isWishlisted: true }),
    ], makePortrait())
    expect(scored.find(candidate => candidate.product.classId === '0x1')!.score).toBe(0)
    expect(scored.find(candidate => candidate.product.classId === '0x2')!.score).toBe(2)
  })

  it('boosts candidates sharing a facet with the seed, whatever pool they came from', () => {
    // The portrait is empty: the boost must come from the seed alone, and a
    // popular-list book by the seed's author now qualifies.
    const scored = scoreCandidates([
      makeCandidate('0x1', { popularRank: 0 }),
      makeCandidate('0x2', { product: { authorName: 'Alice' }, popularRank: 1 }),
      makeCandidate('0x3', { product: { keywords: ['space'] } }),
    ], makePortrait(), { authorName: 'Alice', keywords: ['space'] })
    expect(scored.map(candidate => candidate.product.classId)).toEqual(['0x2', '0x3', '0x1'])
    expect(scored.find(candidate => candidate.product.classId === '0x3')!.score).toBe(2)
  })

  it('ranks a seed recommendation above an inferred facet match', () => {
    const scored = scoreCandidates([
      makeCandidate('0x1', { product: { authorName: 'Alice' } }),
      makeCandidate('0x2'),
    ], makePortrait(), { authorName: 'Alice', recommendedClassIds: ['0X2'] })
    expect(scored[0]!.product.classId).toBe('0x2')
    expect(scored[0]!.score).toBe(3)
  })

  it('boosts books recommended by the portrait, below a seed recommendation', () => {
    const portrait = makePortrait({ recommendedClassIds: ['0x2'] })
    const scored = scoreCandidates([
      makeCandidate('0x1'),
      makeCandidate('0x2'),
    ], portrait)
    expect(scored[0]!.product.classId).toBe('0x2')
    expect(scored[0]!.score).toBe(1.5)
  })

  it('applies the language multiplier to the top portrait language', () => {
    const portrait = makePortrait({
      genres: { 'sci-fi': 1 },
      languages: { zh: 0.8, en: 0.2 },
    })
    const scored = scoreCandidates([
      makeCandidate('0x1', { product: { genre: 'sci-fi' } }),
      makeCandidate('0x2', { product: { genre: 'sci-fi', locales: ['zh'] } }),
    ], portrait)
    expect(scored[0]!.product.classId).toBe('0x2')
    expect(scored[0]!.score).toBeCloseTo(scored[1]!.score * 1.2)
  })
})

describe('applyDiversityGuard', () => {
  function makeScored(
    classId: string,
    product: Partial<BookstoreCMSProduct> = {},
  ): ScoredRecommendationCandidate {
    return { ...makeCandidate(classId, { product }), score: 1 }
  }

  it('caps consecutive slots per author and appends the overflow', () => {
    const sorted = [
      makeScored('0x1', { authorName: 'Alice' }),
      makeScored('0x2', { authorName: 'Alice' }),
      makeScored('0x3', { authorName: 'Alice' }),
      makeScored('0x4', { authorName: 'Alice' }),
      makeScored('0x5', { authorName: 'Bob' }),
    ]
    const result = applyDiversityGuard(sorted, { maxPerAuthor: 3, maxTopicShare: 1 })
    expect(result.map(candidate => candidate.product.classId)).toEqual(['0x1', '0x2', '0x3', '0x5', '0x4'])
  })

  it('defers items when one genre dominates the emitted slots', () => {
    const sorted = [
      makeScored('0x1', { genre: 'sci-fi' }),
      makeScored('0x2', { genre: 'sci-fi' }),
      makeScored('0x3', { genre: 'romance' }),
    ]
    const result = applyDiversityGuard(sorted, { maxPerAuthor: 99, maxTopicShare: 0.5 })
    // The second sci-fi item is deferred: sci-fi already holds 1 of 1 emitted slots.
    expect(result.map(candidate => candidate.product.classId)).toEqual(['0x1', '0x3', '0x2'])
  })

  it('falls back to keyword as the topic when genre is absent', () => {
    const sorted = [
      makeScored('0x1', { keywords: ['space'] }),
      makeScored('0x2', { keywords: ['space'] }),
      makeScored('0x3', { keywords: ['romance'] }),
    ]
    const result = applyDiversityGuard(sorted, { maxPerAuthor: 99, maxTopicShare: 0.5 })
    expect(result.map(candidate => candidate.product.classId)).toEqual(['0x1', '0x3', '0x2'])
  })

  it('prefers genre over keyword as the topic, and never conflates the two', () => {
    const sorted = [
      makeScored('0x1', { genre: 'space' }),
      makeScored('0x2', { keywords: ['space'] }),
      makeScored('0x3', { genre: 'space' }),
    ]
    const result = applyDiversityGuard(sorted, { maxPerAuthor: 99, maxTopicShare: 0.5 })
    // The keyword 'space' is a different topic from the genre 'space', so it is
    // not deferred; the second genre match is.
    expect(result.map(candidate => candidate.product.classId)).toEqual(['0x1', '0x2', '0x3'])
  })

  it('never drops items and passes metadata-free items through', () => {
    const sorted = [
      makeScored('0x1'),
      makeScored('0x2', { authorName: 'Alice' }),
      makeScored('0x3'),
    ]
    const result = applyDiversityGuard(sorted)
    expect(result).toHaveLength(3)
  })
})

describe('cold-start ranking', () => {
  // Mirrors the cold-start branch of computeForYouRecommendations: the popular
  // and latest pools scored against an empty portrait, then diversity-guarded.
  const coldPortrait = makePortrait({ signalBookCount: 0 })

  function rankCold(candidates: RecommendationCandidate[]) {
    return applyDiversityGuard(scoreCandidates(candidates, coldPortrait))
      .map(candidate => candidate.product.classId)
  }

  it('lifts a book that is both popular and recent above one that is merely popular', () => {
    const ranked = rankCold([
      makeCandidate('0xtop', { popularRank: 0 }),
      makeCandidate('0xmid', { popularRank: 1 }),
      makeCandidate('0xboth', { popularRank: 4, latestRank: 0 }),
    ])
    expect(ranked[0]).toBe('0xboth')
  })

  it('does not reproduce the popular listing order', () => {
    const popularOrder = ['0xa', '0xb', '0xc', '0xd']
    const ranked = rankCold([
      ...popularOrder.map((classId, index) => makeCandidate(classId, { popularRank: index })),
      makeCandidate('0xd', { popularRank: 3, latestRank: 0 }),
    ])
    expect(ranked).not.toEqual(popularOrder)
  })

  it('extends the tail with latest-only books so a picked-over page still fills', () => {
    const ranked = rankCold([
      makeCandidate('0xa', { popularRank: 0 }),
      makeCandidate('0xnew', { latestRank: 0 }),
    ])
    // Popular still outranks latest-only, but the feed is no longer capped at
    // whatever survives eligibility filtering in the popular pool alone.
    expect(ranked).toEqual(['0xa', '0xnew'])
  })

  it('raises a wishlisted book above the popular head', () => {
    const ranked = rankCold([
      makeCandidate('0xa', { popularRank: 0 }),
      makeCandidate('0xwish', { popularRank: 9, isWishlisted: true }),
    ])
    expect(ranked[0]).toBe('0xwish')
  })

  it('breaks up an author run the popular listing would keep together', () => {
    const ranked = rankCold(
      ['0xa', '0xb', '0xc', '0xd', '0xe'].map((classId, index) =>
        makeCandidate(classId, {
          popularRank: index,
          product: { authorName: index < 4 ? 'Alice' : 'Bob' },
        }),
      ),
    )
    // Alice holds four of the top five in the popular order; the guard defers
    // her fourth past Bob.
    expect(ranked.slice(0, 4)).toContain('0xe')
  })
})

describe('filterMeaningfulKeywords', () => {
  it('drops boilerplate case-insensitively and dedupes, preserving order', () => {
    expect(filterMeaningfulKeywords(['武俠', 'EBook', '香港', '武俠', '檔案下載', '  ', '電子書']))
      .toEqual(['武俠', '香港'])
  })

  it('trims and tolerates a missing list', () => {
    expect(filterMeaningfulKeywords(['  香港  '])).toEqual(['香港'])
    expect(filterMeaningfulKeywords(undefined)).toEqual([])
  })
})

describe('getTopAffinityKeys', () => {
  it('returns keys sorted by weight, capped at count', () => {
    expect(getTopAffinityKeys({ a: 0.2, b: 0.5, c: 0.3 }, 2)).toEqual(['b', 'c'])
    expect(getTopAffinityKeys({}, 3)).toEqual([])
  })
})
