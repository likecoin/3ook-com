import { PAID_TRIAL_PERIOD_DAYS_THRESHOLD } from '~~/shared/constants/pricing'

// Whether the trial is a paid intro vs a free trial. `isPaidTrialOverride` (set
// for store IAP offers) wins over the day-count heuristic, because a store free
// trial can be >= the threshold and would otherwise be misread as the paid trial.
export function resolveIsPaidTrial(trialPeriodDays?: number, isPaidTrialOverride?: boolean): boolean {
  return isPaidTrialOverride ?? (!!trialPeriodDays && trialPeriodDays >= PAID_TRIAL_PERIOD_DAYS_THRESHOLD)
}
