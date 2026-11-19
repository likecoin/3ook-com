import { describe, expect, it } from 'vitest'
import { GIFT_PLUS_OPTIONS, findGiftPlusOption } from '~~/shared/utils/subscription'

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
