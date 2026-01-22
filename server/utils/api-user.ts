import type { H3Event } from 'h3'
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { BookSettingsData } from '~/types/book-settings'
import type { BookSettingsFirestoreData } from '~/server/types/book-settings'
import type { UserSettingsData } from '~/types/user-settings'
import { FIRESTORE_IN_OPERATOR_LIMIT } from '~/constants/api'

export async function requireUserWallet(event: H3Event): Promise<string> {
  const session = await requireUserSession(event)
  const wallet = session.user.evmWallet
  if (!wallet) {
    throw createError({
      statusCode: 401,
      message: 'WALLET_NOT_FOUND',
    })
  }
  return wallet
}

export interface UserDocData {
  ttsCharactersUsed?: number
  ttsLastUsed?: typeof FieldValue.serverTimestamp
  registerTimestamp?: typeof FieldValue.serverTimestamp
  loginTimestamp?: typeof FieldValue.serverTimestamp
  accessTimestamp?: typeof FieldValue.serverTimestamp
  loginMethod?: string
}

export async function getUserDoc(
  userWallet: string,
): Promise<UserDocData | undefined> {
  const userDocRef = await getUserCollection().doc(userWallet).get()
  return userDocRef.data()
}

export async function updateUserTTSCharacterUsage(
  userWallet: string,
  charactersUsed: number,
): Promise<void> {
  const userDocRef = getUserCollection().doc(userWallet)
  await userDocRef.set({
    ttsCharactersUsed: FieldValue.increment(charactersUsed),
    ttsLastUsed: FieldValue.serverTimestamp(),
  }, { merge: true })
}

export async function getBookSettings(
  userWallet: string,
  nftClassId: string,
): Promise<BookSettingsData | undefined> {
  const bookDocRef = await getUserCollection()
    .doc(userWallet)
    .collection('books')
    .doc(nftClassId.toLowerCase())
    .get()

  const data = bookDocRef.data() as BookSettingsFirestoreData | undefined
  if (!data) return undefined

  return {
    ...data,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : undefined,
  } as BookSettingsData
}

export async function updateBookSettings(
  userWallet: string,
  nftClassId: string,
  settings: Partial<BookSettingsData>,
): Promise<void> {
  const bookDocRef = getUserCollection()
    .doc(userWallet)
    .collection('books')
    .doc(nftClassId.toLowerCase())

  const { updatedAt, ...restSettings } = settings

  await bookDocRef.set({
    ...restSettings,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
}

export async function getBatchBookSettings(
  userWallet: string,
  nftClassIds: string[],
): Promise<Record<string, BookSettingsData>> {
  if (nftClassIds.length === 0) {
    return {}
  }

  const result: Record<string, BookSettingsData> = {}

  // Firestore 'in' operator supports up to 30 values, so we need to chunk
  for (let i = 0; i < nftClassIds.length; i += FIRESTORE_IN_OPERATOR_LIMIT) {
    const chunk = nftClassIds.slice(i, i + FIRESTORE_IN_OPERATOR_LIMIT)
    const snapshot = await getUserCollection()
      .doc(userWallet)
      .collection('books')
      .where(
        FieldPath.documentId(),
        'in',
        chunk.map(id => id.toLowerCase()),
      )
      .get()

    snapshot.forEach((doc) => {
      const data = doc.data() as BookSettingsFirestoreData
      result[doc.id] = {
        ...data,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : undefined,
      } as BookSettingsData
    })
  }

  return result
}

export async function getUserSettings(
  userWallet: string,
): Promise<UserSettingsData> {
  const doc = await getUserCollection().doc(userWallet).get()
  const data = doc.data()
  if (!data) return {}
  return {
    locale: data.locale,
    currency: data.currency,
    colorMode: data.colorMode,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : undefined,
  }
}

export async function updateUserSettings(
  userWallet: string,
  settings: Partial<UserSettingsData>,
): Promise<void> {
  const { updatedAt: _, ...restSettings } = settings

  await getUserCollection().doc(userWallet).set({
    ...restSettings,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
}
