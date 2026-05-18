import { FetchError } from 'ofetch'

import type { LikeCoinNFTClassAggregatedMetadataOptionKey } from '~~/shared/utils/api'
import { fetchLikeCoinNFTClassAggregatedMetadataById, likeCoinNFTClassAggregatedMetadataOptions, resolveLikeCoinNFTMetadataDataOptions } from '~~/shared/utils/api'
import { NFTClassIdParamsSchema } from '~~/server/schemas/params'
import { NFTMetadataQuerySchema } from '~~/server/schemas/nft'

export default defineEventHandler(async (event) => {
  const { nftClassId } = await getValidatedRouterParams(event, createValidator(NFTClassIdParamsSchema))
  const query = await getValidatedQuery(event, createValidator(NFTMetadataQuerySchema))

  const toArray = (value?: string | string[]) => (Array.isArray(value) ? value : value ? [value] : [])

  const validOptionSet = new Set<string>(likeCoinNFTClassAggregatedMetadataOptions)
  const requestedDataRaw = toArray(query.data)
  const invalidRequestedData = requestedDataRaw.filter(option => !validOptionSet.has(option))
  if (invalidRequestedData.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'INVALID_DATA_QUERY',
      message: `Unsupported data option(s): ${invalidRequestedData.join(', ')}`,
    })
  }
  const requestedData = requestedDataRaw as LikeCoinNFTClassAggregatedMetadataOptionKey[]
  const dataOptions = resolveLikeCoinNFTMetadataDataOptions({
    include: requestedData.length ? requestedData : undefined,
  })
  const isCacheDisabled = toArray(query.nocache)[0] === '1'

  const fetcher = () => fetchLikeCoinNFTClassAggregatedMetadataById(nftClassId, {
    include: dataOptions,
    nocache: isCacheDisabled,
  })

  try {
    if (isCacheDisabled) {
      setHeader(event, 'cache-control', 'no-store')
      return await fetcher()
    }

    const result = await fetchCachedNFTClassAggregatedMetadata(nftClassId, dataOptions)
    setHeader(event, 'cache-control', 'public, max-age=60, stale-while-revalidate=600')
    return result
  }
  catch (error) {
    if (error instanceof FetchError && error.statusCode) {
      throw createError({
        statusCode: error.statusCode,
        message: error.data?.error || 'NFT_METADATA_FETCH_FAILED',
      })
    }
    console.error(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'UNEXPECTED_ERROR',
    })
  }
})
