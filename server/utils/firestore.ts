import { getFirestore } from 'firebase-admin/firestore'
import type { Firestore } from 'firebase-admin/firestore'

let db: Firestore | undefined

export function getFirestoreDb(): Firestore {
  if (!db) {
    const firebaseApp = getFirebaseApp()
    db = getFirestore(firebaseApp)
  }
  return db
}

export function getUserCollection() {
  const firestore = getFirestoreDb()
  return firestore.collection('book-users')
}
