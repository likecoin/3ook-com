import type { UploadedBookMeta, UploadedBooksQuota } from '~/shared/types/uploaded-book'

export default defineEventHandler(async (event): Promise<{
  items: UploadedBookMeta[]
  quota: UploadedBooksQuota
}> => {
  const wallet = await requireUserWallet(event)

  const [items, quota] = await Promise.all([
    listUploadedBooks(wallet),
    getUploadedBooksQuota(wallet),
  ])

  return { items, quota }
})
