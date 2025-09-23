import type { CollectionReference, DocumentSnapshot, Timestamp } from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'

function getBookListCollection(userWallet: string) {
  return getUserCollection().doc(userWallet).collection('bookList') as CollectionReference<BookListItemData, BookListItemData>
}

interface BookListItemData {
  timestamp: Timestamp
}

function normalizeBookListItemData(doc: DocumentSnapshot<BookListItemData>): BookListItem {
  const [nftClassId, priceIndex] = doc.id.split('-')
  const data = doc.data()
  return {
    nftClassId: nftClassId as string,
    priceIndex: Number(priceIndex),
    timestamp: data?.timestamp.toMillis(),
  }
}

export async function fetchUserBookList(
  userWallet: string,
): Promise<BookListItem[]> {
  const bookListCollection = getBookListCollection(userWallet)
  const snapshot = await bookListCollection.orderBy('timestamp', 'desc').get()

  return snapshot.docs.map(doc => normalizeBookListItemData(doc))
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

  return normalizeBookListItemData(doc)
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
      statusMessage: 'Book list item already exists',
    })
  }

  try {
    await bookListCollection.doc(docId).create({
      timestamp: FieldValue.serverTimestamp(),
    })

    const newDoc = await bookListCollection.doc(docId).get()
    return normalizeBookListItemData(newDoc)
  }
  catch (error) {
    console.error(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to add book list item',
    })
  }
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
      statusMessage: 'Book list item not found',
    })
  }

  try {
    await docRef.delete()
  }
  catch (error) {
    console.error(error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to remove book from list',
    })
  }
}
