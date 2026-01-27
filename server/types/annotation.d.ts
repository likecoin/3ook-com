import type { Timestamp } from 'firebase-admin/firestore'

export interface AnnotationFirestoreData extends Omit<AnnotationBase, 'id'> {
  note?: string
  chapterTitle?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
