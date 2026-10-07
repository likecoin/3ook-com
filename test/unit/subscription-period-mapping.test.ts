import { describe, expect, it } from 'vitest'
import { getLikerPlusStatusFromPlan, getSubscriptionPlanFromStatus } from '~~/shared/utils/subscription'

describe('getSubscriptionPlanFromStatus', () => {
  it('maps a stored period to the plan the subscription APIs take', () => {
    expect(getSubscriptionPlanFromStatus('month')).toBe('monthly')
    expect(getSubscriptionPlanFromStatus('year')).toBe('yearly')
  })

  it('returns undefined for a non-subscriber, who has no stored period', () => {
    expect(getSubscriptionPlanFromStatus(undefined)).toBeUndefined()
  })
})

describe('getLikerPlusStatusFromPlan', () => {
  it('maps a checkout plan to the period analytics events report', () => {
    expect(getLikerPlusStatusFromPlan('monthly')).toBe('month')
    expect(getLikerPlusStatusFromPlan('yearly')).toBe('year')
  })

  it('returns undefined for a missing or unknown route period', () => {
    expect(getLikerPlusStatusFromPlan(undefined)).toBeUndefined()
    expect(getLikerPlusStatusFromPlan('weekly')).toBeUndefined()
  })
})
