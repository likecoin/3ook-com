import { describe, expect, it } from 'vitest'
import { getSubscriptionPlanFromStatus } from '~~/shared/utils/subscription'

describe('getSubscriptionPlanFromStatus', () => {
  it('maps a stored period to the plan the subscription APIs take', () => {
    expect(getSubscriptionPlanFromStatus('month')).toBe('monthly')
    expect(getSubscriptionPlanFromStatus('year')).toBe('yearly')
  })

  it('returns undefined for a non-subscriber, who has no stored period', () => {
    expect(getSubscriptionPlanFromStatus(undefined)).toBeUndefined()
  })
})
