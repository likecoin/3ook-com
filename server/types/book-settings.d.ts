import type { Timestamp } from 'firebase-admin/firestore'
import type { BookTimestampField } from '~~/shared/types/book-settings'

export interface BookSettingsFirestoreData extends Omit<BaseBookSettingsData, BookTimestampField> {
  updatedAt?: Timestamp
  totalReadingTimeMs?: number
  totalTTSListeningTimeMs?: number
  ttsCharactersUsed?: number
  lastOpenedTime?: Timestamp
  completedAt?: Timestamp | null
  didNotFinishAt?: Timestamp | null
  archivedAt?: Timestamp | null
  preLentReturnedAt?: Timestamp | null
  plusBorrowedAt?: Timestamp | null
  sessionCount?: number
}
