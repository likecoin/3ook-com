export type AnnotationColor = 'yellow' | 'red' | 'green' | 'blue'
export type AnnotationType = 'highlight' | 'bookmark'

export interface AnnotationBase {
  id: string
  type: AnnotationType
  cfi?: string
  page?: number
  text?: string
  color?: AnnotationColor
  note?: string
  chapterTitle?: string
}

export type Annotation = AnnotationBase & {
  chapterTitle: string
  createdAt: number
  updatedAt: number
}

export type AnnotationCreateData = Omit<AnnotationBase, 'id'>

export type AnnotationUpdateData = Partial<Pick<AnnotationBase, 'color' | 'note'>>
