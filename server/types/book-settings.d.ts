import type { Timestamp } from 'firebase-admin/firestore'

export interface BookSettingsFirestoreData extends BaseBookSettingsData {
  updatedAt?: Timestamp
  totalReadingTimeMs?: number
  totalTTSListeningTimeMs?: number
  ttsCharactersUsed?: number
  completedAt?: Timestamp | null
  didNotFinishAt?: Timestamp | null
  archivedAt?: Timestamp | null
  sessionCount?: number
}
