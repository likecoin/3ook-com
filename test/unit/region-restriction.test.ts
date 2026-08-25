import { describe, expect, it } from 'vitest'
import { getIsBookRegionRestricted } from '~~/shared/utils/bookstore'

describe('getIsBookRegionRestricted', () => {
  it('restricts only when a region is on the list', () => {
    expect(getIsBookRegionRestricted(['HK'], 'HK', undefined)).toBe(true)
    expect(getIsBookRegionRestricted(['HK'], 'TW', undefined)).toBe(false)
    expect(getIsBookRegionRestricted(['HK', 'MO'], 'MO', undefined)).toBe(true)
  })

  it('restricts when either the setting or the IP country is on the list', () => {
    expect(getIsBookRegionRestricted(['HK'], 'TW', 'HK')).toBe(true)
    expect(getIsBookRegionRestricted(['HK'], 'HK', 'TW')).toBe(true)
    expect(getIsBookRegionRestricted(['HK'], 'TW', 'JP')).toBe(false)
  })

  it('never restricts without a resolved region', () => {
    expect(getIsBookRegionRestricted(['HK'], undefined, undefined)).toBe(false)
    expect(getIsBookRegionRestricted(['HK'], '', '')).toBe(false)
  })

  it('restricts regardless of the territory casing upstream sends', () => {
    expect(getIsBookRegionRestricted(['hk'], 'HK', undefined)).toBe(true)
    expect(getIsBookRegionRestricted(['Hk'], undefined, 'HK')).toBe(true)
  })

  it('never restricts an untagged book', () => {
    expect(getIsBookRegionRestricted(undefined, 'HK', 'HK')).toBe(false)
    expect(getIsBookRegionRestricted([], 'HK', 'HK')).toBe(false)
  })
})
