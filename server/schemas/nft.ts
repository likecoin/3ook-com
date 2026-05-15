import * as v from 'valibot'

export const NFTMetadataQuerySchema = v.object({
  data: v.optional(v.union([v.string(), v.array(v.string())])),
  nocache: v.optional(v.union([v.string(), v.array(v.string())])),
})
