import type { Timestamp } from 'firebase-admin/firestore'
import type { BaseUserSettingsData } from '~~/shared/types/user-settings'

export interface UserSettingsFirestoreData extends BaseUserSettingsData {
  updatedAt?: Timestamp
}
