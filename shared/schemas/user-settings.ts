import * as v from 'valibot'

export const UserSettingsUpdateSchema = v.pipe(
  v.strictObject({
    locale: v.optional(v.nullable(v.picklist(['en', 'zh-Hant']))),
    currency: v.optional(v.picklist(['auto', 'hkd', 'twd', 'usd'])),
    colorMode: v.optional(v.picklist(['light', 'dark', 'system'])),
    isAdultContentEnabled: v.optional(v.boolean()),
  }, 'INVALID_KEYS'),
  v.check(input => Object.keys(input).length > 0, 'MISSING_BODY'),
)
