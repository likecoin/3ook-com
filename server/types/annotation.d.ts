import type { Timestamp } from 'firebase-admin/firestore'

export interface AnnotationFirestoreData {
  type?: AnnotationType
  cfi?: string
  page?: number
  text?: string
  color?: AnnotationColor
  note?: string
  chapterTitle?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
