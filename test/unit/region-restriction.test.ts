import { describe, expect, it } from 'vitest'
import { getIsBookRegionRestricted } from '~~/shared/utils/bookstore'

describe('getIsBookRegionRestricted', () => {
  it('restricts only when the region is on the list', () => {
    expect(getIsBookRegionRestricted(['HK'], 'HK')).toBe(true)
    expect(getIsBookRegionRestricted(['HK'], 'TW')).toBe(false)
    expect(getIsBookRegionRestricted(['HK', 'MO'], 'MO')).toBe(true)
  })

  it('never restricts without a resolved region', () => {
    expect(getIsBookRegionRestricted(['HK'], undefined)).toBe(false)
    expect(getIsBookRegionRestricted(['HK'], '')).toBe(false)
  })

  it('never restricts an untagged book', () => {
    expect(getIsBookRegionRestricted(undefined, 'HK')).toBe(false)
    expect(getIsBookRegionRestricted([], 'HK')).toBe(false)
  })
})
