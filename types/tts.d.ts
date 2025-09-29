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
  segments: TTSSegment[]
  language: string
  languageVoice: string
  avatarSrc: string
}
