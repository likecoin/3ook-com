import type { UploadedBookMimeType } from '~/shared/utils/uploaded-book'

export interface UploadedBookMeta {
  id: string
  name: string
  contentType: 'epub' | 'pdf'
  fileSize: number
  coverURL?: string
  createdAt: number
}

export interface UploadedBooksQuota {
  count: number
  totalSize: number
  maxCount: number
}

export interface InitUploadedBookResponse {
  bookId: string
  uploadURL: string
  mimeType: UploadedBookMimeType
  contentType: 'epub' | 'pdf'
  expiresAt: number
  coverUploadURL?: string
}
