export interface TTSPlayerModalProps {
  bookTitle?: string
  sectionTitle?: string
  segments?: TTSSegment[] | []
  chapterTitlesBySection?: Record<number, string>
  bookCoverSrc?: string
  bookAuthorName?: string | undefined
  bookLanguage?: string | undefined
  nftClassId?: string
  startIndex?: number
  specificLanguageVoice?: string
  isAutoClose?: boolean
  isFullscreen?: boolean
  onOpen?: () => void
  onClose?: () => void
  onSegmentChange?: (segment: TTSSegment & { index?: number } | undefined) => void
}
