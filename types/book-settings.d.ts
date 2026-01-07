export interface BookSettingsData extends BaseBookSettingsData {
  updatedAt?: number
}

export type BookSettingKey =
  | 'cfi'
  | 'fontSize'
  | 'lineHeight'
  | 'activeTTSElementIndex'
  | 'currentPage'
  | 'scale'
  | 'isDualPageMode'
  | 'isRightToLeft'
  | 'progress'
  | 'lastOpenedTime'
