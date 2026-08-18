import { describe, expect, it } from 'vitest'
import { getSafeFilenameSlug } from '~~/shared/utils/filename'

describe('getSafeFilenameSlug', () => {
  it('collapses runs of punctuation and spaces into single dashes', () => {
    expect(getSafeFilenameSlug('Chapter 1: The Start')).toBe('Chapter-1-The-Start')
  })

  it('keeps CJK, which is a letter class the filename should preserve', () => {
    expect(getSafeFilenameSlug('第一章 開始')).toBe('第一章-開始')
  })

  // The old inline version returned '-.mp3' here: the replace produced a lone
  // dash, which is truthy, so the fallback could never fire.
  it('falls back when the name has nothing to keep', () => {
    expect(getSafeFilenameSlug('...', { fallback: 'chapter' })).toBe('chapter')
    expect(getSafeFilenameSlug('   ', { fallback: 'chapter' })).toBe('chapter')
    expect(getSafeFilenameSlug('', { fallback: 'chapter' })).toBe('chapter')
  })

  it('trims the edge dashes a trailing separator leaves behind', () => {
    expect(getSafeFilenameSlug('Chapter 1: The Start ')).toBe('Chapter-1-The-Start')
    expect(getSafeFilenameSlug('  leading')).toBe('leading')
  })

  // Slicing UTF-16 units would cut an astral character in half and leave a lone
  // surrogate, which then travels through JSON to the native shell.
  it('slices by code point, never splitting a surrogate pair', () => {
    const slug = getSafeFilenameSlug('𠀋'.repeat(40), { maxLength: 5 })
    expect([...slug]).toHaveLength(5)
    expect(slug).toBe('𠀋'.repeat(5))
    expect(/[\uD800-\uDFFF]/.test(slug.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ''))).toBe(false)
  })

  it('caps at maxLength', () => {
    expect(getSafeFilenameSlug('a'.repeat(100), { maxLength: 60 })).toHaveLength(60)
  })
})
