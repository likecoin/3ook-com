declare interface TTSSegment {
  id: string
  text: string
  sectionIndex: number
  cfi?: string
  audioSrc?: string
}

declare interface TTSSample {
  id: string
  title: string
  description: string
  nftClassId: string // Mock NFT Class ID
  segments: TTSSegment[]
  language: string
  languageVoice: string
  avatarSrc: string
}
