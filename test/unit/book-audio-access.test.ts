import { describe, expect, it } from 'vitest'

import {
  getBookAudioAccess,
  getIsBookAudioHiddenForRead,
  getIsBookAudioPlusRequiredForRead,
} from '~~/shared/utils/bookstore'

function createBookstoreInfo(fields: Partial<BookstoreInfo>) {
  return { hideAudio: false, ...fields } as BookstoreInfo
}

const plusReadingOnlyInfo = createBookstoreInfo({
  isAudioPlusReadingOnly: true,
  isPlusReadingEnabled: true,
})

describe('getBookAudioAccess', () => {
  it('opens TTS to all when the listing sets no restriction', () => {
    expect(getBookAudioAccess(createBookstoreInfo({}))).toBe('all')
    expect(getBookAudioAccess(createBookstoreInfo({ isAudioPlusReadingOnly: false }))).toBe('all')
    expect(getBookAudioAccess(undefined)).toBe('all')
  })

  it('limits a Plus-reading-only library book to Plus reading', () => {
    expect(getBookAudioAccess(plusReadingOnlyInfo)).toBe('plus-reading')
  })

  it('hides TTS for a Plus-reading-only book out of the library', () => {
    expect(getBookAudioAccess(createBookstoreInfo({ isAudioPlusReadingOnly: true }))).toBe('none')
  })

  it('lets hideAudio win over Plus-reading-only', () => {
    expect(getBookAudioAccess({ ...plusReadingOnlyInfo, hideAudio: true })).toBe('none')
  })
})

describe('getIsBookAudioHiddenForRead', () => {
  it('shows TTS in a library borrow, even without Plus', () => {
    expect(getIsBookAudioHiddenForRead(plusReadingOnlyInfo, { isLibraryBook: true, isLikerPlus: false })).toBe(false)
  })

  it('shows TTS to a Plus member reading an owned copy', () => {
    expect(getIsBookAudioHiddenForRead(plusReadingOnlyInfo, { isLibraryBook: false, isLikerPlus: true })).toBe(false)
  })

  it('hides TTS from a non-Plus owner', () => {
    expect(getIsBookAudioHiddenForRead(plusReadingOnlyInfo, { isLibraryBook: false, isLikerPlus: false })).toBe(true)
  })

  it('hides TTS from a Plus member once the book leaves the library', () => {
    const info = createBookstoreInfo({ isAudioPlusReadingOnly: true, isPlusReadingEnabled: false })
    expect(getIsBookAudioHiddenForRead(info, { isLibraryBook: false, isLikerPlus: true })).toBe(true)
  })

  it('lets hideAudio win over a library borrow by a Plus member', () => {
    const info = { ...plusReadingOnlyInfo, hideAudio: true }
    expect(getIsBookAudioHiddenForRead(info, { isLibraryBook: true, isLikerPlus: true })).toBe(true)
  })

  it('shows TTS to a non-Plus owner of an unrestricted book', () => {
    const info = createBookstoreInfo({ isPlusReadingEnabled: true })
    expect(getIsBookAudioHiddenForRead(info, { isLibraryBook: false, isLikerPlus: false })).toBe(false)
  })
})

describe('getIsBookAudioPlusRequiredForRead', () => {
  it('requires Plus from a non-Plus owner', () => {
    expect(getIsBookAudioPlusRequiredForRead(plusReadingOnlyInfo, { isLibraryBook: false, isLikerPlus: false })).toBe(true)
  })

  it('does not require Plus when hideAudio is set', () => {
    const info = { ...plusReadingOnlyInfo, hideAudio: true }
    expect(getIsBookAudioPlusRequiredForRead(info, { isLibraryBook: false, isLikerPlus: false })).toBe(false)
  })

  it('does not require Plus once the book leaves the library', () => {
    const info = createBookstoreInfo({ isAudioPlusReadingOnly: true, isPlusReadingEnabled: false })
    expect(getIsBookAudioPlusRequiredForRead(info, { isLibraryBook: false, isLikerPlus: false })).toBe(false)
  })

  it('does not require Plus when TTS is already shown', () => {
    expect(getIsBookAudioPlusRequiredForRead(plusReadingOnlyInfo, { isLibraryBook: false, isLikerPlus: true })).toBe(false)
    expect(getIsBookAudioPlusRequiredForRead(plusReadingOnlyInfo, { isLibraryBook: true, isLikerPlus: false })).toBe(false)
  })
})
