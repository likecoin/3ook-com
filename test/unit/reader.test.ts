import { describe, expect, it } from 'vitest'
import { isLikelyGarbledPDFText, isPDFCorpusUnreadable } from '~/utils/reader'

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
