import * as v from 'valibot'
import { bookIdField } from './params'

// Book settings are fetched either singly (nftClassId) or in batch (nftClassIds,
// which Nuxt surfaces as a string or string[] depending on repeat count).
// At least one of the two must be present.
export const BookSettingsQuerySchema = v.pipe(
  v.object({
    nftClassId: v.optional(bookIdField),
    nftClassIds: v.optional(v.union([bookIdField, v.array(bookIdField)])),
  }),
  v.check(
    query => query.nftClassId !== undefined || query.nftClassIds !== undefined,
    'MISSING_NFT_CLASS_ID_OR_IDS',
  ),
)
