export const UPLOADED_BOOK_ID_PREFIX = 'upload-'

export function isUploadedBookId(id: string): boolean {
  return id.startsWith(UPLOADED_BOOK_ID_PREFIX)
}

export const UPLOADED_BOOK_MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB
export const UPLOADED_BOOK_MAX_COUNT = 5
export const UPLOADED_BOOK_ALLOWED_TYPES = ['application/epub+zip', 'application/pdf']

export type UploadedBookMimeType = 'application/epub+zip' | 'application/pdf'

export const UPLOADED_BOOK_CONTENT_TYPE_TO_MIME: Record<'epub' | 'pdf', UploadedBookMimeType> = {
  epub: 'application/epub+zip',
  pdf: 'application/pdf',
}

export const UPLOADED_BOOK_MIME_TO_CONTENT_TYPE: Record<string, 'epub' | 'pdf'> = {
  'application/epub+zip': 'epub',
  'application/pdf': 'pdf',
}

// Cover is always resized and re-encoded to JPEG on the client before upload,
// so we only need to accept one type on the server. On the client, users can
// pick any common image format — the resize step converts it.
export const UPLOADED_BOOK_COVER_MIME_TYPE = 'image/jpeg'
export const UPLOADED_BOOK_COVER_EXT = 'jpg'
export const UPLOADED_BOOK_MAX_COVER_SIZE = 1 * 1024 * 1024 // 1 MB after resize
export const UPLOADED_BOOK_COVER_MAX_DIMENSION = 800
// Mime types the client will accept from the user's picker. EPUB-embedded
// covers also go through this allowlist before the resize step.
export const UPLOADED_BOOK_COVER_PICKER_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
]
