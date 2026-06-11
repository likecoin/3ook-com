import type { AffiliateVoiceData } from '~~/shared/types/custom-voice'

export interface AffiliatePublicGiftBook {
  classId: string
  priceIndex: number
  name?: string
  cover?: string
}

export type AffiliatePublicConfig =
  | {
    active: false
    isPlusDiscountAllowed?: boolean
  }
  | {
    active: true
    giftBooks?: AffiliatePublicGiftBook[]
    giftOnTrial?: boolean
    isPlusDiscountAllowed?: boolean
    affiliateClassIds: string[]
    affiliatePublisherWallets: string[]
    customVoices: AffiliateVoiceData[]
  }
