import { H3Error } from 'h3'

import { TagIdParamsSchema } from '~~/server/schemas/params'

export default defineEventHandler(async (event) => {
  try {
    const { id: tagId } = await getValidatedRouterParams(event, createValidator(TagIdParamsSchema))

    const result = await fetchBookstoreCMSTagById(tagId)
    if (!result) {
      throw createError({
        statusCode: 404,
        statusMessage: 'TAG_NOT_FOUND',
      })
    }

    setHeader(event, 'cache-control', 'public, max-age=3600, stale-while-revalidate=86400')
    return result
  }
  catch (error) {
    if (error instanceof H3Error) {
      throw error
    }
    console.error(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'UNEXPECTED_ERROR',
    })
  }
})
