import type { Timestamp } from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'
import { checksumAddress } from 'viem'

function getBookListCollection(userWallet: string) {
  return getUserCollection().doc(userWallet).collection('bookList')
}

interface BookListItemData {
  nftClassId: string
  priceIndex: number
  timestamp: Timestamp
}

function normalizeBookListItemData({
  nftClassId,
  priceIndex,
  timestamp,
}: BookListItemData): BookListItem {
  return {
    nftClassId,
    priceIndex,
    timestamp: timestamp.toMillis(),
  }
}

export async function fetchUserBookList(
  userWallet: string,
): Promise<BookListItem[]> {
  const bookListCollection = getBookListCollection(userWallet)
  const snapshot = await bookListCollection.orderBy('timestamp', 'desc').get()

  return snapshot.docs.map(doc => normalizeBookListItemData(doc.data() as BookListItemData))
}

export async function fetchUserBookListItem(
  userWallet: string,
  nftClassId: string,
  priceIndex: number,
): Promise<BookListItem | null> {
  const bookListCollection = getBookListCollection(userWallet)
  const docId = getBookListItemId(nftClassId, priceIndex)
  const doc = await bookListCollection.doc(docId).get()

  if (!doc.exists) {
    return null
  }

  return normalizeBookListItemData(doc.data() as BookListItemData)
}

export async function addUserBookListItem(
  userWallet: string,
  nftClassId: string,
  priceIndex: number,
): Promise<BookListItem> {
  const bookListCollection = getBookListCollection(userWallet)
  const docId = getBookListItemId(nftClassId, priceIndex)
  const doc = await bookListCollection.doc(docId).get()

  if (doc.exists) {
    throw createError({
      statusCode: 409,
      statusMessage: 'BOOK_LIST_ITEM_EXISTS',
    })
  }

  await bookListCollection.doc(docId).set({
    nftClassId: checksumAddress(nftClassId as `0x${string}`),
    priceIndex,
    timestamp: FieldValue.serverTimestamp(),
  })

  const newDoc = await bookListCollection.doc(docId).get()
  return normalizeBookListItemData(newDoc.data() as BookListItemData)
}

export async function deleteUserBookListItem(
  userWallet: string,
  nftClassId: string,
  priceIndex: number,
): Promise<void> {
  const bookListCollection = getBookListCollection(userWallet)
  const docId = getBookListItemId(nftClassId, priceIndex)
  const docRef = bookListCollection.doc(docId)
  const doc = await docRef.get()

  if (!doc.exists) {
    throw createError({
      statusCode: 404,
      statusMessage: 'BOOK_LIST_ITEM_NOT_FOUND',
    })
  }

  await docRef.delete()
}
