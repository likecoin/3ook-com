import { describe, expect, it } from 'vitest'
import {
  PUBLISHER_PAGE_TITLE_DESCRIPTION_MAX_LENGTH,
  getPublisherPageTitle,
} from '~/utils/publisher-page-title'

const suffix = '3ook.com 電子書'

describe('getPublisherPageTitle', () => {
  it('joins name, description and suffix', () => {
    expect(getPublisherPageTitle({
      displayName: '本事出版',
      description: '書印出來以後，書本身就有自己的生命。',
      suffix,
    })).toBe('本事出版 - 書印出來以後，書本身就有自己的生命。 - 3ook.com 電子書')
  })

  it('omits the description segment when it is empty or blank', () => {
    const expected = '本事出版 - 3ook.com 電子書'
    expect(getPublisherPageTitle({ displayName: '本事出版', suffix })).toBe(expected)
    expect(getPublisherPageTitle({ displayName: '本事出版', description: '', suffix })).toBe(expected)
    expect(getPublisherPageTitle({ displayName: '本事出版', description: ' \n\t ', suffix })).toBe(expected)
  })

  it('returns an empty string for a curated storefront', () => {
    expect(getPublisherPageTitle({
      displayName: 'Karen',
      description: '書印出來以後，書本身就有自己的生命。',
      isCurated: true,
      suffix,
    })).toBe('')
    expect(getPublisherPageTitle({ displayName: 'Karen', isCurated: false, suffix }))
      .toBe('Karen - 3ook.com 電子書')
  })

  it('trims and collapses line breaks into single spaces', () => {
    expect(getPublisherPageTitle({
      displayName: 'Press',
      description: '  First line\n\nSecond\r\nline  ',
      suffix,
    })).toBe('Press - First line Second line - 3ook.com 電子書')
  })

  it('keeps a description exactly at the limit intact', () => {
    const description = '書'.repeat(PUBLISHER_PAGE_TITLE_DESCRIPTION_MAX_LENGTH)
    expect(getPublisherPageTitle({ displayName: 'A', description, suffix }))
      .toBe(`A - ${description} - ${suffix}`)
  })

  it('truncates a long description with an ellipsis within the limit', () => {
    const description = '書'.repeat(PUBLISHER_PAGE_TITLE_DESCRIPTION_MAX_LENGTH + 5)
    const summary = `${'書'.repeat(PUBLISHER_PAGE_TITLE_DESCRIPTION_MAX_LENGTH - 1)}…`
    expect(getPublisherPageTitle({ displayName: 'A', description, suffix }))
      .toBe(`A - ${summary} - ${suffix}`)
  })

  it('does not split a surrogate pair or leave a trailing space before the ellipsis', () => {
    const head = `${'a'.repeat(PUBLISHER_PAGE_TITLE_DESCRIPTION_MAX_LENGTH - 3)} 📚`
    const description = `${head}${'b'.repeat(10)}`
    const title = getPublisherPageTitle({ displayName: 'A', description, suffix })
    expect(title).toBe(`A - ${head}… - ${suffix}`)

    const spaced = `${'a'.repeat(PUBLISHER_PAGE_TITLE_DESCRIPTION_MAX_LENGTH - 2)} ${'b'.repeat(10)}`
    expect(getPublisherPageTitle({ displayName: 'A', description: spaced, suffix }))
      .toBe(`A - ${'a'.repeat(PUBLISHER_PAGE_TITLE_DESCRIPTION_MAX_LENGTH - 2)}… - ${suffix}`)
  })
})
