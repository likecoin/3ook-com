import * as v from 'valibot'

import { ANNOTATION_NOTE_MAX_LENGTH, ANNOTATION_TEXT_MAX_LENGTH } from '~~/shared/constants/annotations'

const AnnotationColorSchema = v.picklist(
  ['yellow', 'red', 'green', 'blue'] as const,
  'MISSING_OR_INVALID_COLOR',
)

const HighlightCreateSchema = v.object({
  type: v.literal('highlight', 'MISSING_OR_INVALID_TYPE'),
  cfi: v.pipe(
    v.string('MISSING_OR_INVALID_CFI'),
    v.nonEmpty('MISSING_OR_INVALID_CFI'),
  ),
  text: v.pipe(
    v.string('MISSING_OR_INVALID_TEXT'),
    v.nonEmpty('MISSING_OR_INVALID_TEXT'),
    v.maxLength(ANNOTATION_TEXT_MAX_LENGTH, 'TEXT_TOO_LONG'),
  ),
  color: AnnotationColorSchema,
  note: v.optional(v.pipe(
    v.string('INVALID_NOTE'),
    v.maxLength(ANNOTATION_NOTE_MAX_LENGTH, 'INVALID_NOTE'),
  )),
  chapterTitle: v.optional(v.string('INVALID_CHAPTER_TITLE')),
})

const BookmarkCreateSchema = v.pipe(
  v.object({
    type: v.literal('bookmark', 'MISSING_OR_INVALID_TYPE'),
    cfi: v.optional(v.pipe(
      v.string('MISSING_OR_INVALID_CFI'),
      v.nonEmpty('MISSING_OR_INVALID_CFI'),
    )),
    page: v.optional(v.pipe(
      v.number('MISSING_OR_INVALID_PAGE'),
      v.integer('MISSING_OR_INVALID_PAGE'),
      v.minValue(1, 'MISSING_OR_INVALID_PAGE'),
    )),
    text: v.optional(v.pipe(
      v.string('INVALID_TEXT'),
      v.maxLength(ANNOTATION_TEXT_MAX_LENGTH, 'TEXT_TOO_LONG'),
    )),
    chapterTitle: v.optional(v.string('INVALID_CHAPTER_TITLE')),
  }),
  v.check(
    input => (input.cfi !== undefined) !== (input.page !== undefined),
    'MISSING_OR_INVALID_ANCHOR',
  ),
)

export const AnnotationCreateSchema = v.variant(
  'type',
  [HighlightCreateSchema, BookmarkCreateSchema],
  'MISSING_OR_INVALID_TYPE',
)

export const AnnotationUpdateSchema = v.pipe(
  v.object({
    color: v.optional(v.picklist(
      ['yellow', 'red', 'green', 'blue'] as const,
      'INVALID_COLOR',
    )),
    note: v.optional(v.pipe(
      v.string('INVALID_NOTE'),
      v.maxLength(ANNOTATION_NOTE_MAX_LENGTH, 'INVALID_NOTE'),
    )),
  }),
  v.check(
    input => input.color !== undefined || input.note !== undefined,
    'MISSING_UPDATE_FIELDS',
  ),
)
