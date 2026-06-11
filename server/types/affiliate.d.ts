export interface AffiliateCustomVoice {
  id: string
  name: string
  language?: string
  avatarUrl?: string
  provider?: string
  providerVoiceId: string
}

export interface AffiliateGiftBook {
  classId: string
  priceIndex: number
}

export interface AffiliateConfig {
  active: boolean
  affiliateClassIds: string[]
  affiliatePublisherWallets: string[]
  giftBooks?: AffiliateGiftBook[]
  giftOnTrial?: boolean
  customVoices: AffiliateCustomVoice[]
}
