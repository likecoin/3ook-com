import { describe, expect, it } from 'vitest'
import { defu } from 'defu'

// setUserSession merges with defu, which skips undefined and null source values, so
// any field that has to be *cleared* on refresh must be written as a defined value.
// These guard the shape of the session payload, not the endpoints themselves.
describe('session merge clears a resolved pending downgrade', () => {
  it('clears the flag once the downgrade is undone', () => {
    const existing = { hasPendingPlusDowngrade: true }
    const merged = defu({ hasPendingPlusDowngrade: false }, existing)
    expect(merged.hasPendingPlusDowngrade).toBe(false)
  })

  it('shows why the tier itself could not be stored: undefined never clears', () => {
    const existing = { likerPlusPendingTier: 'plus' }
    const merged = defu({ likerPlusPendingTier: undefined }, existing)
    expect(merged.likerPlusPendingTier).toBe('plus')
  })

  it('sets the flag when a downgrade is pending', () => {
    const merged = defu({ hasPendingPlusDowngrade: true }, { hasPendingPlusDowngrade: false })
    expect(merged.hasPendingPlusDowngrade).toBe(true)
  })
})
