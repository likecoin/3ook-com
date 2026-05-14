import type { AffiliateVoiceData } from '~~/shared/types/custom-voice'

export type AffiliatePublicConfig =
  | {
    active: false
    isPlusDiscountAllowed?: boolean
  }
  | {
    active: true
    giftClassId?: string
    giftBookName?: string
    giftBookCover?: string
    giftOnTrial?: boolean
    isPlusDiscountAllowed?: boolean
    affiliateClassIds: string[]
    customVoices: AffiliateVoiceData[]
  }
