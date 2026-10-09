import { describe, expect, it } from 'vitest'
import { IMAGE_CAP_THEME_RULES, markPrePaginatedPage } from '~/utils/epub'

function getCappedImages(isPrePaginated: boolean) {
  const document = new DOMParser().parseFromString('<html><body><img><svg></svg></body></html>', 'text/html')
  if (isPrePaginated) markPrePaginatedPage(document)
  const [selector] = Object.keys(IMAGE_CAP_THEME_RULES)
  return document.querySelectorAll(selector!)
}

describe('IMAGE_CAP_THEME_RULES', () => {
  it('caps images on reflowable pages', () => {
    expect(getCappedImages(false)).toHaveLength(2)
  })

  it('skips pre-paginated pages', () => {
    expect(getCappedImages(true)).toHaveLength(0)
  })
})
