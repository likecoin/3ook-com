export function clampGiftQuantity(value: unknown): number {
  const quantity = Math.floor(Number(value))
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1
}

// The gift periods sold on /gift/plus, each also listed as a card on the gift tag.
export const GIFT_PLUS_OPTIONS: readonly { period: SubscriptionPlan, quantity: number }[] = [
  { period: 'monthly', quantity: 1 },
  { period: 'monthly', quantity: 3 },
  { period: 'monthly', quantity: 6 },
  { period: 'yearly', quantity: 1 },
  { period: 'yearly', quantity: 2 },
]

// The 《Q版特工》 gift artwork runs through 2026-12-31 Hong Kong time,
// then the cards and /gift/plus fall back to the default artwork.
const GIFT_PLUS_Q_AGENT_PROMO_END_AT = Date.parse('2027-01-01T00:00:00+08:00')

export function isGiftPlusQAgentPromoActive(now: number = Date.now()): boolean {
  return now < GIFT_PLUS_Q_AGENT_PROMO_END_AT
}

export function findGiftPlusOption(period: unknown, quantity: unknown) {
  const count = clampGiftQuantity(quantity)
  return GIFT_PLUS_OPTIONS.find(option => option.period === period && option.quantity === count)
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

// Checkout and the success-page route carry a SubscriptionPlan, while analytics
// events report the period as LikerPlusStatus, as the server-side events do.
const PLAN_TO_STATUS = Object.fromEntries(
  Object.entries(STATUS_TO_PLAN).map(([status, plan]) => [plan, status]),
) as Record<string, LikerPlusStatus | undefined>

export function getLikerPlusStatusFromPlan(plan?: string): LikerPlusStatus | undefined {
  return plan ? PLAN_TO_STATUS[plan] : undefined
}

// Sessions predating Civic carry no likerPlusTier field; an active Plus
// subscriber reads as 'plus'. Non-subscribers have no likerPlusTier at all.
export function getEffectiveLikerPlusTier(
  user?: { isLikerPlus?: boolean, likerPlusTier?: LikerPlusTier } | null,
): LikerPlusTier | undefined {
  if (!user?.isLikerPlus) return undefined
  return user.likerPlusTier || 'plus'
}
