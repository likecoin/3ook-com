export interface BaseBookSettingsData {
  'epub-cfi'?: string
  'epub-fontSize'?: number
  'epub-lineHeight'?: number
  'epub-writingMode'?: 'horizontal-tb' | 'vertical-rl'
  'epub-activeTTSElementIndex'?: number
  'pdf-currentPage'?: number
  'pdf-scale'?: number
  'pdf-isDualPageMode'?: boolean
  'pdf-isRightToLeft'?: boolean
  'progress'?: number
  'lastOpenedTime'?: number
  'completedAt'?: number | null
  'didNotFinishAt'?: number | null
  'archivedAt'?: number | null
  'preLentReturnedAt'?: number | null
}

export type BookTimestampField = 'lastOpenedTime' | 'completedAt' | 'didNotFinishAt' | 'archivedAt' | 'preLentReturnedAt'

export interface BookSettingsUpdatePayload extends Omit<Partial<BaseBookSettingsData>, BookTimestampField> {
  lastOpenedTime?: true
  completedAt?: true | null
  didNotFinishAt?: true | null
  archivedAt?: true | null
  preLentReturnedAt?: true | null
}

export interface BookSettingsData extends BaseBookSettingsData {
  updatedAt?: number
  // Server-accumulated reading/TTS totals (read-only; not part of the update payload)
  totalReadingTimeMs?: number
  totalTTSListeningTimeMs?: number
}

export type BookSettingKey =
  | 'cfi'
  | 'fontSize'
  | 'lineHeight'
  | 'writingMode'
  | 'activeTTSElementIndex'
  | 'currentPage'
  | 'scale'
  | 'isDualPageMode'
  | 'isRightToLeft'
  | 'progress'
  | 'lastOpenedTime'
