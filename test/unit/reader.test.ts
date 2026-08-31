import { describe, expect, it } from 'vitest'
import { clampPDFPageNumber, findOfflineBookCopy, getBookFileCacheKey, isEPUBTargetInSpine, isLikelyGarbledPDFText, isPDFCorpusUnreadable, isValidPDFPageNumber } from '~/utils/reader'
// ?raw, not node:fs: the nuxt test environment stubs fs via unenv.
import epubPageSource from '~~/app/pages/reader/epub.vue?raw'

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

describe('isValidPDFPageNumber', () => {
  it('accepts whole page numbers from one upwards', () => {
    expect(isValidPDFPageNumber(1)).toBe(true)
    expect(isValidPDFPageNumber(5)).toBe(true)
  })

  it('rejects zero, which is what a page turn against an unloaded document produces', () => {
    expect(isValidPDFPageNumber(0)).toBe(false)
    expect(isValidPDFPageNumber(-3)).toBe(false)
  })

  it('rejects values no page could have', () => {
    expect(isValidPDFPageNumber(1.5)).toBe(false)
    expect(isValidPDFPageNumber(Number.NaN)).toBe(false)
    expect(isValidPDFPageNumber(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isValidPDFPageNumber(undefined)).toBe(false)
    expect(isValidPDFPageNumber('2')).toBe(false)
  })
})

describe('clampPDFPageNumber', () => {
  it('leaves a page that exists in the document alone', () => {
    expect(clampPDFPageNumber(3, 5)).toBe(3)
    expect(clampPDFPageNumber(5, 5)).toBe(5)
  })

  it('falls back to the first page while the document is still loading', () => {
    // totalPages is 0 until pdf.js finishes parsing; nothing is renderable yet.
    expect(clampPDFPageNumber(4, 0)).toBe(1)
  })

  it('pulls a page past the end back to the last one', () => {
    // A position saved against the full book, reopened on the 1-page preview.
    expect(clampPDFPageNumber(4, 1)).toBe(1)
    expect(clampPDFPageNumber(120, 20)).toBe(20)
  })

  it('repairs a stored page that names no page at all', () => {
    expect(clampPDFPageNumber(0, 5)).toBe(1)
    expect(clampPDFPageNumber(-2, 5)).toBe(1)
    expect(clampPDFPageNumber(Number.NaN, 5)).toBe(1)
    expect(clampPDFPageNumber(undefined, 5)).toBe(1)
  })
})

describe('isEPUBTargetInSpine', () => {
  // The helper only asks whether spine.get() resolves, so a stub keyed on the
  // targets this file still has stands in for both href and CFI lookups.
  function createSpine(hrefs: string[]) {
    return { get: (target?: string) => hrefs.includes(target ?? '') ? { href: target } : null }
  }

  it('allows an untargeted display, which anchors on the first section', () => {
    expect(isEPUBTargetInSpine(createSpine([]), undefined)).toBe(true)
    expect(isEPUBTargetInSpine(createSpine(['ch1.xhtml']), '')).toBe(true)
  })

  it('allows a target the loaded spine still resolves', () => {
    expect(isEPUBTargetInSpine(createSpine(['ch1.xhtml', 'ch2.xhtml']), 'ch2.xhtml')).toBe(true)
  })

  it('drops a position that outlived its document', () => {
    // A synced CFI, or a preview whose later chapters were truncated away.
    expect(isEPUBTargetInSpine(createSpine(['ch1.xhtml']), 'ch9.xhtml')).toBe(false)
    expect(isEPUBTargetInSpine(createSpine(['ch1.xhtml']), 'epubcfi(/6/20!/4/2/2[p3]/1:0)')).toBe(false)
  })

  it('drops a target whose lookup throws, since the display would fail too', () => {
    const spine = {
      get: () => {
        throw new Error('EPUBCFI parse error')
      },
    }
    expect(isEPUBTargetInSpine(spine, 'epubcfi(bogus)')).toBe(false)
  })

  it('lets the display attempt decide when there is no spine to check', () => {
    expect(isEPUBTargetInSpine(undefined, 'ch1.xhtml')).toBe(true)
  })
})

describe('epub rendition identity guards', () => {
  // The reader pins its `rendered`/`relocated` handlers to the rendition they
  // were created for by identity. A deep `ref` hands back a reactive Proxy, so
  // every guard would miss and silently stop clearing the spinner.
  it('holds the rendition in a shallowRef', () => {
    expect(epubPageSource).toMatch(/const rendition = shallowRef</)
  })
})
