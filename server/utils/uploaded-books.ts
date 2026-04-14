import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { UploadedBookMeta, UploadedBooksQuota } from '~/shared/types/uploaded-book'
import { UPLOADED_BOOK_MAX_COUNT } from '~/shared/utils/uploaded-book'

export interface UploadedBookServerMeta extends UploadedBookMeta {
  storagePath: string
  coverStoragePath?: string
}

interface UploadedBookFirestoreData {
  name: string
  contentType: 'epub' | 'pdf'
  fileSize: number
  storagePath: string
  coverURL?: string
  coverStoragePath?: string
  createdAt: Timestamp
}

function getUploadedBooksCollection(wallet: string) {
  return getUserCollection().doc(wallet).collection('uploaded-books')
}

function toUploadedBookServerMeta(id: string, data: UploadedBookFirestoreData): UploadedBookServerMeta {
  return {
    id,
    name: data.name,
    contentType: data.contentType,
    fileSize: data.fileSize,
    storagePath: data.storagePath,
    coverURL: data.coverURL,
    coverStoragePath: data.coverStoragePath,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now(),
  }
}

function toUploadedBookMeta(serverMeta: UploadedBookServerMeta): UploadedBookMeta {
  const { storagePath: _storagePath, coverStoragePath: _coverStoragePath, ...meta } = serverMeta
  return meta
}

export async function listUploadedBooks(wallet: string): Promise<UploadedBookMeta[]> {
  const snapshot = await getUploadedBooksCollection(wallet)
    .orderBy('createdAt', 'desc')
    .get()
  return snapshot.docs.map(doc =>
    toUploadedBookMeta(toUploadedBookServerMeta(doc.id, doc.data() as UploadedBookFirestoreData)),
  )
}

export async function getUploadedBook(wallet: string, bookId: string): Promise<UploadedBookServerMeta | undefined> {
  const doc = await getUploadedBooksCollection(wallet).doc(bookId).get()
  const data = doc.data() as UploadedBookFirestoreData | undefined
  if (!data) return undefined
  return toUploadedBookServerMeta(doc.id, data)
}

export async function createUploadedBook(
  wallet: string,
  data: {
    id: string
    name: string
    contentType: 'epub' | 'pdf'
    fileSize: number
    storagePath: string
    coverURL?: string
    coverStoragePath?: string
  },
): Promise<UploadedBookMeta> {
  const userDocRef = getUserCollection().doc(wallet)
  const bookDocRef = getUploadedBooksCollection(wallet).doc(data.id)

  const firestoreData: UploadedBookFirestoreData = {
    name: data.name,
    contentType: data.contentType,
    fileSize: data.fileSize,
    storagePath: data.storagePath,
    createdAt: Timestamp.now(),
    ...(data.coverURL && { coverURL: data.coverURL }),
    ...(data.coverStoragePath && { coverStoragePath: data.coverStoragePath }),
  }

  await getFirestoreDb().runTransaction(async (tx) => {
    const [userDoc, bookDoc] = await Promise.all([
      tx.get(userDocRef),
      tx.get(bookDocRef),
    ])
    if (bookDoc.exists) {
      throw createError({ statusCode: 409, message: 'BOOK_ALREADY_EXISTS' })
    }
    const count = userDoc.data()?.uploadedBooksCount || 0
    if (count >= UPLOADED_BOOK_MAX_COUNT) {
      throw createError({ statusCode: 400, message: 'UPLOAD_QUOTA_EXCEEDED' })
    }
    tx.set(bookDocRef, firestoreData)
    tx.set(userDocRef, {
      uploadedBooksCount: FieldValue.increment(1),
      uploadedBooksTotalSize: FieldValue.increment(data.fileSize),
    }, { merge: true })
  })

  return toUploadedBookMeta(toUploadedBookServerMeta(data.id, firestoreData))
}

export async function deleteUploadedBook(wallet: string, bookId: string): Promise<UploadedBookMeta | undefined> {
  const book = await getUploadedBook(wallet, bookId)
  if (!book) return undefined

  const userDocRef = getUserCollection().doc(wallet)
  const bookDocRef = getUploadedBooksCollection(wallet).doc(bookId)

  const batch = getFirestoreDb().batch()
  batch.delete(bookDocRef)
  batch.set(userDocRef, {
    uploadedBooksCount: FieldValue.increment(-1),
    uploadedBooksTotalSize: FieldValue.increment(-book.fileSize),
  }, { merge: true })
  await batch.commit()

  // Delete from Cloud Storage
  const bucket = getUploadedBooksStorageBucket()
  if (bucket) {
    const pathsToDelete = [book.storagePath]
    if (book.coverStoragePath) pathsToDelete.push(book.coverStoragePath)
    await Promise.all(pathsToDelete.map(async (path) => {
      try {
        await bucket.file(path).delete({ ignoreNotFound: true })
      }
      catch (error) {
        console.warn(`Failed to delete uploaded book file from storage: ${path}`, error)
      }
    }))
  }

  return toUploadedBookMeta(book)
}

export async function getUploadedBooksQuota(wallet: string): Promise<UploadedBooksQuota> {
  const userDoc = await getUserCollection().doc(wallet).get()
  const data = userDoc.data()
  return {
    count: data?.uploadedBooksCount || 0,
    totalSize: data?.uploadedBooksTotalSize || 0,
    maxCount: UPLOADED_BOOK_MAX_COUNT,
  }
}
