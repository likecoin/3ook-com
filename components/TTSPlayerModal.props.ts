export interface TTSPlayerModalProps {
  bookTitle?: string
  sectionTitle?: string
  segments?: TTSSegment[] | []
  bookCoverSrc?: string
  bookAuthorName?: string | undefined
  bookLanguage?: string | undefined
  nftClassId?: string
  startIndex?: number
  onOpen?: () => void
  onClose?: () => void
  onSegmentChange?: (segment: { id?: string, text?: string, href?: string, index?: number } | undefined) => void
}
