export function clampGiftQuantity(value: unknown): number {
  const quantity = Math.floor(Number(value))
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

const STATUS_TO_PLAN: Record<LikerPlusStatus, SubscriptionPlan> = {
  month: 'monthly',
  year: 'yearly',
}

// The session stores a period as LikerPlusStatus; the subscription APIs take a
// SubscriptionPlan. Bridge the two vocabularies in one place.
export function getSubscriptionPlanFromStatus(
  status?: LikerPlusStatus,
): SubscriptionPlan | undefined {
  return status ? STATUS_TO_PLAN[status] : undefined
}

// Sessions predating Civic carry no likerPlusTier field; an active Plus
// subscriber reads as 'plus'. Non-subscribers have no likerPlusTier at all.
export function getEffectiveLikerPlusTier(
  user?: { isLikerPlus?: boolean, likerPlusTier?: LikerPlusTier } | null,
): LikerPlusTier | undefined {
  if (!user?.isLikerPlus) return undefined
  return user.likerPlusTier || 'plus'
}
