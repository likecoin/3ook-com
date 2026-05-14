import { BookListBodySchema } from '~~/server/schemas/book-list'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const userWallet = session.user.evmWallet
  const { nftClassId, priceIndex } = await readValidatedBody(event, createValidator(BookListBodySchema))

  const bookListItem = await addUserBookListItem(userWallet, nftClassId, priceIndex)

  publishEvent(event, 'BookListAdd', {
    evmWallet: userWallet,
    nftClassId,
    priceIndex,
  })

  return bookListItem
})
