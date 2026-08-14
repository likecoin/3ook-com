declare type SubscriptionPlan = 'monthly' | 'yearly'
declare type LikerPlusStatus = 'month' | 'year'
// 'shared' means Plus granted via a Civic subscriber's shared member seat.
declare type LikerPlusProvider = 'stripe' | 'revenuecat' | 'shared'
// Which store bills a 'revenuecat' subscription. Undefined for every other
// provider, and on sessions predating the field.
declare type LikerPlusStore = 'app_store' | 'play_store'
// Civic is a superset of Plus: isLikerPlus stays true, tier discriminates.
declare type LikerPlusTier = 'plus' | 'civic'
// Pricing page benefits copy experiment. Retire with the experiment.
declare type PricingBenefitsCopyVariant = 'variant-a' | 'variant-b'
