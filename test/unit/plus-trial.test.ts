import { describe, expect, it } from 'vitest'
import { getPlusTrialPeriod, PLUS_TRIAL_OFF_VARIANT } from '~/utils/plus-trial'
import { DEFAULT_TRIAL_PERIOD_DAYS } from '~~/shared/constants/pricing'

describe('getPlusTrialPeriod', () => {
  it('gives a plain visitor the default trial and puts them in the experiment', () => {
    expect(getPlusTrialPeriod()).toEqual({
      trialPeriodDays: DEFAULT_TRIAL_PERIOD_DAYS,
      isExperimentEligible: true,
    })
  })

  // The bug this replaces: an affiliate with only custom voices and no gift book
  // lost the trial, so their link charged the full price immediately.
  it('keeps the default trial for an affiliate with nothing to gift', () => {
    expect(getPlusTrialPeriod({ isAffiliateGiftOnTrialDisabled: false })).toEqual({
      trialPeriodDays: DEFAULT_TRIAL_PERIOD_DAYS,
      isExperimentEligible: true,
    })
  })

  it('drops the trial for an affiliate that gifts a book off-trial only', () => {
    expect(getPlusTrialPeriod({ isAffiliateGiftOnTrialDisabled: true })).toEqual({
      trialPeriodDays: 0,
      isExperimentEligible: false,
    })
  })

  it('drops the trial for a coupon, a returning member, and in-app purchases', () => {
    expect(getPlusTrialPeriod({ hasCoupon: true })).toEqual({
      trialPeriodDays: 0,
      isExperimentEligible: false,
    })
    expect(getPlusTrialPeriod({ isExpiredLikerPlus: true })).toEqual({
      trialPeriodDays: 0,
      isExperimentEligible: false,
    })
    expect(getPlusTrialPeriod({ isIAPSupported: true, iapTrialPeriodDays: 14 })).toEqual({
      trialPeriodDays: 14,
      isExperimentEligible: false,
    })
  })

  it('honours the trial query overrides', () => {
    const days = (trialQuery: string) => getPlusTrialPeriod({ trialQuery }).trialPeriodDays
    expect(days('0')).toBe(0)
    expect(days('0d')).toBe(0)
    expect(days('1d')).toBe(1)
    expect(days('3d')).toBe(3)
    expect(days('5d')).toBe(5)
    expect(days('7d')).toBe(7)
    expect(days('14d')).toBe(14)
    expect(days('30d')).toBe(30)
    expect(getPlusTrialPeriod({ trialQuery: '7d' }).isExperimentEligible).toBe(false)
    // An unrecognised value falls through to the default.
    expect(getPlusTrialPeriod({ trialQuery: '2d' })).toEqual({
      trialPeriodDays: DEFAULT_TRIAL_PERIOD_DAYS,
      isExperimentEligible: true,
    })
  })

  it('takes the trial away in the off variant but keeps the control on it', () => {
    expect(getPlusTrialPeriod({ experimentVariant: PLUS_TRIAL_OFF_VARIANT })).toEqual({
      trialPeriodDays: 0,
      isExperimentEligible: true,
    })
    expect(getPlusTrialPeriod({ experimentVariant: 'control' }).trialPeriodDays)
      .toBe(DEFAULT_TRIAL_PERIOD_DAYS)
  })

  // The variant only ever reaches an eligible visitor,
  // but a stale one must not override a trial that was already decided elsewhere.
  it('ignores the variant once something else has decided the trial', () => {
    expect(getPlusTrialPeriod({
      trialQuery: '14d',
      experimentVariant: PLUS_TRIAL_OFF_VARIANT,
    })).toEqual({ trialPeriodDays: 14, isExperimentEligible: false })
  })
})
