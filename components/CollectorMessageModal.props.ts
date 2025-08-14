export interface CollectorMessageModalProps {
  bookCoverSrc: string
  bookName: string
  bookAuthor: string
  isLoading?: boolean
  hasSubmitted?: boolean
  handleSubmit?: (message: string) => void
}
