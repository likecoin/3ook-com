import { DEFAULT_TRIAL_PERIOD_DAYS } from '~~/shared/constants/pricing'

export const PLUS_TRIAL_EXPERIMENT_KEY = 'plus-affiliate-trial'
export const PLUS_TRIAL_OFF_VARIANT = 'off'

// `?trial=` overrides, for campaign links that need a non-default trial.
const TRIAL_QUERY_PERIOD_DAYS: Record<string, number> = {
  '0': 0,
  '0d': 0,
  '1d': 1,
  '3d': 3,
  '5d': 5,
  '7d': 7,
  '14d': 14,
  '30d': 30,
}

export interface PlusTrialPeriodInput {
  trialQuery?: string
  isIAPSupported?: boolean
  iapTrialPeriodDays?: number
  isExpiredLikerPlus?: boolean
  hasCoupon?: boolean
  // The affiliate opted out of gifting on a trial *and* has a book to gift.
  // An affiliate with nothing to gift keeps the standard trial,
  // mirroring the backend, which reads giftOnTrial only alongside giftBooks.
  isAffiliateGiftOnTrialDisabled?: boolean
  experimentVariant?: string | null
}

export interface PlusTrialPeriod {
  trialPeriodDays: number
  // True only when the length came from the site-wide default,
  // the one population the experiment is allowed to move.
  isExperimentEligible: boolean
}

export function getPlusTrialPeriod({
  trialQuery = '',
  isIAPSupported = false,
  iapTrialPeriodDays = 0,
  isExpiredLikerPlus = false,
  hasCoupon = false,
  isAffiliateGiftOnTrialDisabled = false,
  experimentVariant = null,
}: PlusTrialPeriodInput = {}): PlusTrialPeriod {
  const decided = (trialPeriodDays: number): PlusTrialPeriod => ({
    trialPeriodDays,
    isExperimentEligible: false,
  })
  // On IAP the store is the source of truth for the trial:
  // the web's route-query overrides and Stripe defaults don't apply,
  // because no Stripe trial will ensue regardless.
  if (isIAPSupported) return decided(iapTrialPeriodDays)
  // A returning member (previously subscribed) isn't eligible for a fresh trial,
  // so never promise one in the CTA — they'd be charged immediately.
  if (isExpiredLikerPlus) return decided(0)
  const queriedPeriodDays = TRIAL_QUERY_PERIOD_DAYS[trialQuery]
  if (queriedPeriodDays !== undefined) return decided(queriedPeriodDays)
  if (isAffiliateGiftOnTrialDisabled) return decided(0)
  if (hasCoupon) return decided(0)
  return {
    trialPeriodDays: experimentVariant === PLUS_TRIAL_OFF_VARIANT ? 0 : DEFAULT_TRIAL_PERIOD_DAYS,
    isExperimentEligible: true,
  }
}
