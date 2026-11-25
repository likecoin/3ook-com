import { describe, expect, it } from 'vitest'
import { GIFT_PLUS_OPTIONS, findGiftPlusOption, isGiftPlusQAgentPromoActive } from '~~/shared/utils/subscription'

describe('findGiftPlusOption', () => {
  it('matches every listed gift period, including a string quantity from the URL', () => {
    for (const option of GIFT_PLUS_OPTIONS) {
      expect(findGiftPlusOption(option.period, String(option.quantity))).toEqual(option)
    }
  })

  it('rejects periods the gift page does not sell', () => {
    expect(findGiftPlusOption('monthly', '5')).toBeUndefined()
    expect(findGiftPlusOption('weekly', '1')).toBeUndefined()
    expect(findGiftPlusOption('', '')).toBeUndefined()
  })
})

describe('isGiftPlusQAgentPromoActive', () => {
  it('runs through the last second of 2026 in Hong Kong', () => {
    expect(isGiftPlusQAgentPromoActive(Date.parse('2026-11-24T12:00:00+08:00'))).toBe(true)
    expect(isGiftPlusQAgentPromoActive(Date.parse('2026-12-31T23:59:59+08:00'))).toBe(true)
  })

  it('ends at midnight on 2027-01-01 in Hong Kong', () => {
    expect(isGiftPlusQAgentPromoActive(Date.parse('2027-01-01T00:00:00+08:00'))).toBe(false)
    expect(isGiftPlusQAgentPromoActive(Date.parse('2027-02-01T00:00:00+08:00'))).toBe(false)
  })
})
