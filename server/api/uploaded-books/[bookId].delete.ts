import { UploadedBookIdParamsSchema } from '~/server/schemas/uploaded-book'

export default defineEventHandler(async (event) => {
  const wallet = await requireUserWallet(event)
  const { bookId } = await getValidatedRouterParams(event, createValidator(UploadedBookIdParamsSchema))

  const deleted = await deleteUploadedBook(wallet, bookId)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'BOOK_NOT_FOUND' })
  }

  return { ok: true }
})
