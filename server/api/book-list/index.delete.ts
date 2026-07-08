import { BookListBodySchema } from '~~/server/schemas/book-list'

export default defineEventHandler(async (event) => {
  const userWallet = await requireUserWallet(event)
  const { nftClassId, priceIndex } = await readValidatedBody(event, createValidator(BookListBodySchema))

  await deleteUserBookListItem(userWallet, nftClassId, priceIndex)

  publishEvent(event, 'BookListRemove', {
    evmWallet: userWallet,
    nftClassId,
    priceIndex,
  })
})
