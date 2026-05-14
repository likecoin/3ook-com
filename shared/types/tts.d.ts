declare interface TTSSegment {
  id: string
  text: string
  sectionIndex: number
  elementIndex?: number
  cfi?: string
  audioSrc?: string
}

declare interface TTSSampleAttribution {
  text: string
  nftClassId?: string
}

declare interface TTSSample {
  id: string
  title: string
  description: string
  segments: TTSSegment[]
  language: string
  languageVoice: string
  avatarSrc: string
  isAffiliateExclusive?: boolean
  affiliateExclusiveBadgeText?: string
  attribution?: TTSSampleAttribution
}
