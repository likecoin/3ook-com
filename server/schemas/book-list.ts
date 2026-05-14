import * as v from 'valibot'
import { nftClassIdField } from '~~/server/schemas/params'

export const BookListBodySchema = v.object({
  nftClassId: nftClassIdField,
  priceIndex: v.optional(v.number(), 0),
})

export const BookListQuerySchema = v.object({
  nft_class_id: nftClassIdField,
  price_index: v.optional(v.string()),
})
