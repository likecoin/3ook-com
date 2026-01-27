export type AnnotationColor = 'yellow' | 'red' | 'green' | 'blue'

export interface AnnotationBase {
  id: string
  cfi: string
  text: string
  color: AnnotationColor
  note?: string
  chapterTitle?: string
}

export interface Annotation extends AnnotationBase {
  note: string
  chapterTitle: string
  createdAt: number
  updatedAt: number
}

export type AnnotationCreateData = Omit<AnnotationBase, 'id'>

export type AnnotationUpdateData = Partial<Pick<AnnotationBase, 'color' | 'note'>>
