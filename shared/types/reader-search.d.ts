declare interface ReaderSearchResult {
  id: string
  excerpt: string
  chapterTitle?: string
  pageLabel?: string
  // Opaque locator interpreted by the parent reader — CFI string for EPUB,
  // page number string for PDF.
  locator: string
}
