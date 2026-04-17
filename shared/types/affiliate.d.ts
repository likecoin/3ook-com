import type { AffiliateVoiceData } from '~/shared/types/custom-voice'

export type AffiliatePublicConfig =
  | { active: false }
  | {
    active: true
    giftClassId?: string
    giftBookName?: string
    giftBookCover?: string
    giftOnTrial?: boolean
    affiliateClassIds: string[]
    customVoices: AffiliateVoiceData[]
  }
