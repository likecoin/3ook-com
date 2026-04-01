import * as v from 'valibot'

export const BookSettingsUpdateSchema = v.pipe(
  v.strictObject({
    'epub-cfi': v.optional(v.string()),
    'epub-fontSize': v.optional(v.number()),
    'epub-lineHeight': v.optional(v.number()),
    'epub-writingMode': v.optional(v.picklist(['horizontal-tb', 'vertical-rl'])),
    'epub-activeTTSElementIndex': v.optional(v.number()),
    'pdf-currentPage': v.optional(v.number()),
    'pdf-scale': v.optional(v.number()),
    'pdf-isDualPageMode': v.optional(v.boolean()),
    'pdf-isRightToLeft': v.optional(v.boolean()),
    'progress': v.optional(v.number()),
    'lastOpenedTime': v.optional(v.number()),
  }, 'INVALID_KEYS'),
  v.check(input => Object.keys(input).length > 0, 'MISSING_BODY'),
)
