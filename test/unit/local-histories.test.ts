import { describe, expect, it } from 'vitest'
import {
  HK_LOCAL_HISTORIES_CONFIG,
  TW_LOCAL_HISTORIES_CONFIG,
} from '~~/shared/constants/local-histories'

// Regions rendered only in the featured grid, with no matching region card
const EXTRA_REGIONS: Record<string, string[]> = {
  TW: ['全台', '離島'],
  HK: [],
}

const CONFIGS = [
  ['TW', TW_LOCAL_HISTORIES_CONFIG],
  ['HK', HK_LOCAL_HISTORIES_CONFIG],
] as const

describe.each(CONFIGS)('%s local histories config', (name, config) => {
  it('has unique region keys', () => {
    const keys = config.regions.map(region => region.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('maps every item region to a region group or documented extra', () => {
    const names = new Set([
      ...config.regions.map(region => region.name),
      ...EXTRA_REGIONS[name] ?? [],
    ])
    config.items.forEach((item) => {
      expect(names, `item "${item.title}" region "${item.region}"`).toContain(item.region)
    })
  })

  it('has three hero stats', () => {
    expect(config.heroStats).toHaveLength(3)
  })

  it('starts featured tags with the show-all tag', () => {
    expect(config.featuredTags[0]).toBe('全部')
  })
})
