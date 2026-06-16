import type { H3Event } from 'h3'
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { BookSettingsData, BookSettingsUpdatePayload } from '~~/shared/types/book-settings'
import type { BookSettingsFirestoreData } from '~~/server/types/book-settings'
import type { UserSettingsData } from '~~/shared/types/user-settings'
import { FIRESTORE_IN_OPERATOR_LIMIT } from '~~/shared/constants/api'

export async function requireUserWalletWithStatus(event: H3Event): Promise<{
  wallet: string
  isLikerPlus: boolean
  // Paid (non-trial) Plus. Reading-library revenue share excludes trial usage, so
  // forwards to the API gate on this, not on isLikerPlus (which includes trial).
  isPaidPlus: boolean
}> {
  const session = await requireUserSession(event)
  const wallet = session.user.evmWallet
  if (!wallet) {
    throw createError({
      statusCode: 401,
      message: 'WALLET_NOT_FOUND',
    })
  }
  const isLikerPlus = !!session.user.isLikerPlus
  return {
    wallet,
    isLikerPlus,
    isPaidPlus: isLikerPlus && !session.user.isLikerPlusTrial,
  }
}

export async function requireUserWallet(event: H3Event): Promise<string> {
  const { wallet } = await requireUserWalletWithStatus(event)
  return wallet
}

export interface CustomVoiceDocData {
  voiceId: string
  voiceName: string
  voiceLanguage?: string
  avatarPath?: string
  avatarUrl?: string
  audioPath?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface UserDocData {
  ttsCharactersUsed?: number
  ttsLastUsed?: typeof FieldValue.serverTimestamp
  registerTimestamp?: typeof FieldValue.serverTimestamp
  loginTimestamp?: typeof FieldValue.serverTimestamp
  accessTimestamp?: typeof FieldValue.serverTimestamp
  loginMethod?: string
  customVoice?: CustomVoiceDocData
  totalReadingTimeMs?: number
  totalTTSListeningTimeMs?: number
  totalPlusReadingTimeMs?: number
  totalPlusTTSListeningTimeMs?: number
  totalBooksCompleted?: number
  readingStreak?: {
    currentDays: number
    longestDays: number
    lastActiveDate: string
  }
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

function timestampToMillis(value: Timestamp | null | undefined): number | undefined {
  return value instanceof Timestamp ? value.toMillis() : undefined
}

function normalizeBookSettings(data: BookSettingsFirestoreData): BookSettingsData {
  // lastOpenedTime accepts a legacy number for records written before the
  // Timestamp migration; new writes are always Timestamp.
  // totalReadingTimeMs / totalTTSListeningTimeMs are surfaced to the client (for
  // the bookshelf time header); ttsCharactersUsed / sessionCount / plusBorrowedAt
  // stay server-only.
  const {
    lastOpenedTime,
    ttsCharactersUsed: _ttsCharactersUsed,
    sessionCount: _sessionCount,
    plusBorrowedAt: _plusBorrowedAt,
    ...clientFields
  } = data
  const rawLastOpened = lastOpenedTime as Timestamp | number | undefined
  return {
    ...clientFields,
    updatedAt: timestampToMillis(data.updatedAt),
    completedAt: timestampToMillis(data.completedAt),
    didNotFinishAt: timestampToMillis(data.didNotFinishAt),
    archivedAt: timestampToMillis(data.archivedAt),
    lastOpenedTime: rawLastOpened instanceof Timestamp ? rawLastOpened.toMillis() : rawLastOpened,
  } as BookSettingsData
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

  return normalizeBookSettings(data)
}

export async function updateBookSettings(
  userWallet: string,
  nftClassId: string,
  settings: BookSettingsUpdatePayload,
): Promise<void> {
  const bookDocRef = getUserCollection()
    .doc(userWallet)
    .collection('books')
    .doc(nftClassId.toLowerCase())

  const {
    completedAt,
    didNotFinishAt,
    archivedAt,
    lastOpenedTime,
    ...restSettings
  } = settings

  const timestampFields = Object.fromEntries(
    Object.entries({ completedAt, didNotFinishAt, archivedAt, lastOpenedTime })
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        value === null ? FieldValue.delete() : FieldValue.serverTimestamp(),
      ]),
  )

  await bookDocRef.set({
    ...restSettings,
    ...timestampFields,
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
      result[doc.id] = normalizeBookSettings(doc.data() as BookSettingsFirestoreData)
    })
  }

  return result
}

// Max number of borrowed (non-owned) Plus-reading books kept on a shelf.
const PLUS_READING_LIMIT = 20

/**
 * Borrows a non-owned Plus-reading book (or refreshes its recency on re-open),
 * stamping its LRU marker. Borrows are capped at PLUS_READING_LIMIT; overflow
 * has its marker cleared (hide-only — the doc and reading progress are retained).
 */
export async function markPlusReadingBook(
  userWallet: string,
  nftClassId: string,
): Promise<void> {
  const booksCollection = getUserCollection().doc(userWallet).collection('books')
  const bookDocRef = booksCollection.doc(nftClassId.toLowerCase())

  // Re-stamping an existing borrow can't grow the borrow set, so only a
  // genuinely new borrow runs the eviction query below (offset bills for every
  // skipped doc, so it's worth avoiding when nothing can have overflowed).
  const existing = await bookDocRef.get()
  const wasAlreadyBorrowed = !!existing.data()?.plusBorrowedAt

  await bookDocRef.set({
    plusBorrowedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  if (wasAlreadyBorrowed) return

  // Evict least-recently-borrowed books beyond the cap. A single-field orderBy
  // implicitly excludes docs without plusBorrowedAt, so no composite index is
  // required; offset skips the newest LIMIT docs to find the overflow.
  const overflow = await booksCollection
    .orderBy('plusBorrowedAt', 'desc')
    .offset(PLUS_READING_LIMIT)
    .limit(500) // cap eviction at Firestore's per-batch op limit; self-heals on next borrow
    .get()
  if (overflow.empty) return

  const batch = getFirestoreDb().batch()
  overflow.forEach((doc) => {
    batch.set(doc.ref, { plusBorrowedAt: FieldValue.delete() }, { merge: true })
  })
  await batch.commit()
}

/**
 * Returns a borrowed Plus-reading book to drop it from the shelf entirely.
 * Clears the marker; reading progress on the doc is retained.
 */
export async function dropPlusReadingBook(
  userWallet: string,
  nftClassId: string,
): Promise<void> {
  await getUserCollection()
    .doc(userWallet)
    .collection('books')
    .doc(nftClassId.toLowerCase())
    .set({
      plusBorrowedAt: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
}

/**
 * Returns the wallet's borrowed Plus-reading book class IDs, most-recent first.
 */
export async function getPlusReadingBooks(
  userWallet: string,
): Promise<string[]> {
  const snapshot = await getUserCollection()
    .doc(userWallet)
    .collection('books')
    .orderBy('plusBorrowedAt', 'desc')
    .limit(PLUS_READING_LIMIT)
    .get()

  return snapshot.docs.map(doc => doc.id)
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
    isAdultContentEnabled: data.isAdultContentEnabled,
    updatedAt: timestampToMillis(data.updatedAt),
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

export async function getCustomVoice(
  userWallet: string,
): Promise<CustomVoiceDocData | undefined> {
  const doc = await getUserDoc(userWallet)
  return doc?.customVoice
}

export async function setCustomVoice(
  userWallet: string,
  data: { voiceId: string, voiceName: string, voiceLanguage?: string, audioPath?: string, avatarPath?: string, avatarUrl?: string },
): Promise<void> {
  await getUserCollection().doc(userWallet).set({
    customVoice: {
      voiceId: data.voiceId,
      voiceName: data.voiceName,
      ...(data.voiceLanguage && { voiceLanguage: data.voiceLanguage }),
      ...(data.audioPath && { audioPath: data.audioPath }),
      ...(data.avatarPath && { avatarPath: data.avatarPath }),
      ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
  }, { merge: true })
}

export async function updateCustomVoice(
  userWallet: string,
  fields: { voiceName?: string, voiceLanguage?: string },
): Promise<void> {
  const update: Record<string, unknown> = {
    'customVoice.updatedAt': FieldValue.serverTimestamp(),
  }
  if (fields.voiceName !== undefined) update['customVoice.voiceName'] = fields.voiceName
  if (fields.voiceLanguage !== undefined) update['customVoice.voiceLanguage'] = fields.voiceLanguage
  await getUserCollection().doc(userWallet).update(update)
}

export async function deleteCustomVoice(
  userWallet: string,
): Promise<void> {
  await getUserCollection().doc(userWallet).update({
    customVoice: FieldValue.delete(),
  })
}

export async function incrementBookReadingTime(
  userWallet: string,
  nftClassId: string,
  payload: {
    activeReadingTimeMs: number
    ttsActiveTimeMs: number
    isLikerPlus: boolean
    countSession?: boolean
  },
): Promise<{ isBorrowed: boolean }> {
  const { activeReadingTimeMs, ttsActiveTimeMs, isLikerPlus, countSession } = payload
  const userDocRef = getUserCollection().doc(userWallet)
  const bookDocRef = userDocRef.collection('books').doc(nftClassId.toLowerCase())

  // Both reading and TTS share accrue only for borrowed (Plus-library) books;
  // owned reads/listens don't fund the pool. `plusBorrowedAt` is stamped
  // server-side at borrow time, so we read it here rather than trust the client.
  let isBorrowed = false
  let plusReadingTimeMs = 0
  let plusTTSListeningTimeMs = 0
  if (isLikerPlus && (activeReadingTimeMs > 0 || ttsActiveTimeMs > 0)) {
    const bookDoc = await bookDocRef.get()
    isBorrowed = !!bookDoc.data()?.plusBorrowedAt
    if (isBorrowed) {
      plusReadingTimeMs = activeReadingTimeMs
      plusTTSListeningTimeMs = ttsActiveTimeMs
    }
  }

  const batch = getFirestoreDb().batch()

  batch.set(userDocRef, {
    totalReadingTimeMs: FieldValue.increment(activeReadingTimeMs),
    totalTTSListeningTimeMs: FieldValue.increment(ttsActiveTimeMs),
    totalPlusReadingTimeMs: FieldValue.increment(plusReadingTimeMs),
    totalPlusTTSListeningTimeMs: FieldValue.increment(plusTTSListeningTimeMs),
  }, { merge: true })

  batch.set(bookDocRef, {
    totalReadingTimeMs: FieldValue.increment(activeReadingTimeMs),
    totalTTSListeningTimeMs: FieldValue.increment(ttsActiveTimeMs),
    totalPlusReadingTimeMs: FieldValue.increment(plusReadingTimeMs),
    totalPlusTTSListeningTimeMs: FieldValue.increment(plusTTSListeningTimeMs),
    ...(countSession && { sessionCount: FieldValue.increment(1) }),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  await batch.commit()

  return { isBorrowed }
}

export async function updateReadingStreak(
  userWallet: string,
): Promise<void> {
  const userDocRef = getUserCollection().doc(userWallet)

  await getFirestoreDb().runTransaction(async (transaction) => {
    const doc = await transaction.get(userDocRef)
    const data = doc.data()
    const streak = data?.readingStreak || { currentDays: 0, longestDays: 0, lastActiveDate: '' }

    const now = new Date()
    const today = toUTCDateString(now)
    if (streak.lastActiveDate === today) return

    const yesterday = new Date(now)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const yesterdayStr = toUTCDateString(yesterday)

    let newCurrentDays: number
    if (streak.lastActiveDate === yesterdayStr) {
      newCurrentDays = (streak.currentDays || 0) + 1
    }
    else {
      newCurrentDays = 1
    }

    const newLongestDays = Math.max(newCurrentDays, streak.longestDays || 0)

    transaction.set(userDocRef, {
      readingStreak: {
        currentDays: newCurrentDays,
        longestDays: newLongestDays,
        lastActiveDate: today,
      },
    }, { merge: true })
  })
}

export async function markBookCompleted(
  userWallet: string,
  nftClassId: string,
): Promise<boolean> {
  const bookDocRef = getUserCollection()
    .doc(userWallet)
    .collection('books')
    .doc(nftClassId.toLowerCase())
  const userDocRef = getUserCollection().doc(userWallet)

  const isNewCompletion = await getFirestoreDb().runTransaction(async (transaction) => {
    const doc = await transaction.get(bookDocRef)
    if (doc.data()?.completedAt) return false
    transaction.set(bookDocRef, {
      completedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
    transaction.set(userDocRef, {
      totalBooksCompleted: FieldValue.increment(1),
    }, { merge: true })
    return true
  })

  return isNewCompletion
}

export async function incrementBookTTSCharacterUsage(
  userWallet: string,
  nftClassId: string,
  charactersUsed: number,
): Promise<void> {
  const bookDocRef = getUserCollection()
    .doc(userWallet)
    .collection('books')
    .doc(nftClassId.toLowerCase())

  await bookDocRef.set({
    ttsCharactersUsed: FieldValue.increment(charactersUsed),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
}
