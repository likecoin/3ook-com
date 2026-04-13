export interface AffiliateCustomVoice {
  id: string
  name: string
  language?: string
  avatarUrl?: string
  provider?: string
  providerVoiceId: string
}

export interface AffiliateConfig {
  active: boolean
  affiliateClassIds: string[]
  giftClassId?: string
  giftPriceIndex?: number
  giftOnTrial?: boolean
  customVoices: AffiliateCustomVoice[]
}
