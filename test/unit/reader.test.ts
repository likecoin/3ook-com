import { describe, expect, it } from 'vitest'
import { findOfflineBookCopy, getBookFileCacheKey, isLikelyGarbledPDFText, isPDFCorpusUnreadable } from '~/utils/reader'

describe('isLikelyGarbledPDFText', () => {
  it('returns false for short strings', () => {
    expect(isLikelyGarbledPDFText('¬¬«»')).toBe(false)
    expect(isLikelyGarbledPDFText('12 / 78')).toBe(false)
  })

  it('returns false for clean Traditional Chinese prose', () => {
    const text = '雖然「Nuzlocke 挑戰」具體執行有很多變化形，但最核心的規則包括兩條：玩家只能夠捕捉每次踏入新地域時第一次野生遭遇的小精靈，以及「瀕死」的小精靈會視為「死亡」，必須放生或者永久寄存在電腦中。'
    expect(isLikelyGarbledPDFText(text)).toBe(false)
  })

  it('returns false for clean English prose', () => {
    const text = 'The quick brown fox jumps over the lazy dog. '.repeat(5)
    expect(isLikelyGarbledPDFText(text)).toBe(false)
  })

  it('returns false for French prose with accents and guillemets', () => {
    const text = 'Il a répondu «bonjour» très poliment, puis il s\'est éloigné. C\'était une journée magnifique à Paris, sous un ciel dégagé.'.repeat(3)
    expect(isLikelyGarbledPDFText(text)).toBe(false)
  })

  // The user's Litmus 試紙 PDF surfaces this exact failure mode: SourceHanSans
  // subsets emitted by Adobe Illustrator without /ToUnicode CMaps. pdf.js
  // returns glyph IDs as Latin-1 bytes.
  it('returns true for glyph-ID dump from a missing-ToUnicode CMap', () => {
    const text = 'é VH«±B BVH 3*N+*)I¨ åÌ å Ùe]ä ø=4OV¼ø¯Y £]àá¶ ÙÚ7ª5½dã«¬7]^ð["­= Íðn£K i;@¯ ÿ~D£©;@ÂG4Æ;@kb º-Ñ åÍÍ í£º½ÛÙ½ºùÑªØ×b¨î!ºùD¥² ~=«Ù² ¬Þ4\'n'
    expect(isLikelyGarbledPDFText(text)).toBe(true)
  })

  it('returns true for sustained Latin-1 symbol density', () => {
    const text = 'V«JBCB¬¬ ôB«AP«6 +T ñ ½üî\\ïð ¬¦¯¨¶§¤¼½¾'.repeat(4)
    expect(isLikelyGarbledPDFText(text)).toBe(true)
  })
})

describe('findOfflineBookCopy', () => {
  const CACHE_KEY_PREFIX = '3ook'
  const NFT_CLASS_ID = '0xabc'

  function findIn(cacheKeys: string[], params: {
    nftIds?: string[]
    fileIndex?: string | number
  } = {}) {
    return findOfflineBookCopy({
      offlineCacheKeys: new Set(cacheKeys),
      cacheKeyPrefix: CACHE_KEY_PREFIX,
      nftClassId: NFT_CLASS_ID,
      ...params,
    })
  }

  function keyFor(nftId: string | undefined, fileIndex: string | number = '0') {
    return getBookFileCacheKey({
      cacheKeyPrefix: CACHE_KEY_PREFIX,
      nftClassId: NFT_CLASS_ID,
      nftId,
      fileIndex,
    })
  }

  it('returns undefined when nothing is cached', () => {
    expect(findIn([], { nftIds: ['1'] })).toBeUndefined()
    expect(findIn([])).toBeUndefined()
  })

  // The reader caches under the nft_id it was opened with — a claim link or an
  // older bookmark can leave the file under a copy that isn't nftIds[0].
  it('matches a copy that is not the first owned one', () => {
    expect(findIn([keyFor('2')], { nftIds: ['1', '2'] })).toEqual({ nftId: '2' })
  })

  it('prefers the first owned copy when several are cached', () => {
    expect(findIn([keyFor('1'), keyFor('2')], { nftIds: ['1', '2'] })).toEqual({ nftId: '1' })
  })

  // A borrow owns no copy, so the reader sets no nft_id and the shelf passes
  // an empty list. The hit must be distinguishable from no hit at all.
  it('matches the borrow variant when no copy is owned', () => {
    expect(findIn([keyFor(undefined)])).toEqual({ nftId: undefined })
    expect(findIn([keyFor(undefined)], { nftIds: [] })).toEqual({ nftId: undefined })
  })

  // reader.vue injects an nft_id whenever an owner's route lacks one, so an
  // owner can never reach an nftId-less entry — claiming it would be a false promise.
  it('ignores the borrow variant for an owner', () => {
    expect(findIn([keyFor(undefined)], { nftIds: ['1'] })).toBeUndefined()
  })

  it('does not match a different file of a multi-format book', () => {
    expect(findIn([keyFor('1', 1)], { nftIds: ['1'], fileIndex: 0 })).toBeUndefined()
    expect(findIn([keyFor('1', 1)], { nftIds: ['1'], fileIndex: 1 })).toEqual({ nftId: '1' })
  })
})

describe('isPDFCorpusUnreadable', () => {
  it('returns false for an empty document', () => {
    expect(isPDFCorpusUnreadable({ pagesWithText: 0, garbledPages: 0 })).toBe(false)
  })

  it('returns false at or below the threshold', () => {
    // 20% of pages garbled — below 30%; 30% exactly should still be treated as readable.
    expect(isPDFCorpusUnreadable({ pagesWithText: 100, garbledPages: 20 })).toBe(false)
    expect(isPDFCorpusUnreadable({ pagesWithText: 100, garbledPages: 30 })).toBe(false)
  })

  it('returns true above the threshold', () => {
    expect(isPDFCorpusUnreadable({ pagesWithText: 100, garbledPages: 31 })).toBe(true)
    expect(isPDFCorpusUnreadable({ pagesWithText: 78, garbledPages: 60 })).toBe(true)
  })

  it('locks the verdict mid-iteration when worst-case clean tail still trips', () => {
    // Mid-iteration: pass numPages as the most generous denominator. If even
    // then we're above the threshold, no remaining clean page can save us.
    expect(isPDFCorpusUnreadable({ pagesWithText: 78, garbledPages: 30 })).toBe(true)
  })
})
