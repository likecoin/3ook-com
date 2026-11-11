import { describe, expect, it } from 'vitest'
import {
  getWritingModeThemeRules,
  IMAGE_CAP_THEME_RULES,
  markPrePaginatedPage,
  markVerticalWritingPage,
} from '~/utils/epub'

function getMatchedImageRules({ isPrePaginated = false, writingMode = 'horizontal-tb' } = {}) {
  const document = new DOMParser().parseFromString('<html><body><img><svg></svg></body></html>', 'text/html')
  document.documentElement.style.setProperty('writing-mode', writingMode)
  if (isPrePaginated) markPrePaginatedPage(document)
  markVerticalWritingPage(document)
  return Object.entries(IMAGE_CAP_THEME_RULES)
    .filter(([selector]) => document.querySelectorAll(selector).length === 2)
    .flatMap(([, rule]) => Object.keys(rule))
}

describe('IMAGE_CAP_THEME_RULES', () => {
  it('caps images on horizontal reflowable pages', () => {
    expect(getMatchedImageRules()).toEqual(['height', 'max-width', 'max-height'])
  })

  it('leaves vertical reflowable pages to epub.js pixel caps', () => {
    expect(getMatchedImageRules({ writingMode: 'vertical-rl' })).toEqual(['height'])
  })

  it('skips pre-paginated pages', () => {
    expect(getMatchedImageRules({ isPrePaginated: true })).toEqual([])
    expect(getMatchedImageRules({ isPrePaginated: true, writingMode: 'vertical-rl' })).toEqual([])
  })
})

describe('getWritingModeThemeRules', () => {
  function getMatchedSelectors({ isPrePaginated = false } = {}) {
    const document = new DOMParser().parseFromString('<html><body></body></html>', 'text/html')
    if (isPrePaginated) markPrePaginatedPage(document)
    return Object.keys(getWritingModeThemeRules({ 'writing-mode': 'vertical-rl' }))
      .flatMap(selector => Array.from(document.querySelectorAll(selector), element => element.tagName))
  }

  it('applies to <html> and <body> of reflowable pages', () => {
    expect(getMatchedSelectors()).toEqual(['HTML', 'BODY'])
  })

  it('skips pre-paginated pages', () => {
    expect(getMatchedSelectors({ isPrePaginated: true })).toEqual([])
  })
})
