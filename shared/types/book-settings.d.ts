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
  'archivedAt'?: number | null
}
