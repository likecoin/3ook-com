import { createHash } from 'node:crypto'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'

import { ANNOTATION_COLORS_MAP } from '~/constants/annotations'
import type { AnnotationFirestoreData } from '~/server/types/annotation'

function convertCFIToDocId(cfi: string): string {
  return createHash('sha256').update(cfi).digest('hex')
}

function getAnnotationsCollection(userWallet: string, nftClassId: string) {
  return getUserCollection()
    .doc(userWallet)
    .collection('books')
    .doc(nftClassId.toLowerCase())
    .collection('annotations')
}

function convertFirestoreToAnnotation(docId: string, data: AnnotationFirestoreData): Annotation {
  const { note, chapterTitle, createdAt, updatedAt, ...baseData } = data
  return {
    ...baseData,
    id: docId,
    note: note || '',
    chapterTitle: chapterTitle || '',
    createdAt: createdAt instanceof Timestamp ? createdAt.toMillis() : Date.now(),
    updatedAt: updatedAt instanceof Timestamp ? updatedAt.toMillis() : Date.now(),
  }
}

export async function getAnnotations(
  userWallet: string,
  nftClassId: string,
): Promise<Annotation[]> {
  const snapshot = await getAnnotationsCollection(userWallet, nftClassId)
    .orderBy('createdAt', 'asc')
    .get()

  return snapshot.docs.map((doc) => {
    const data = doc.data() as AnnotationFirestoreData
    return convertFirestoreToAnnotation(doc.id, data)
  })
}

export async function createAnnotation(
  userWallet: string,
  nftClassId: string,
  data: AnnotationCreateData,
): Promise<Annotation> {
  const collection = getAnnotationsCollection(userWallet, nftClassId)
  const docRef = collection.doc(convertCFIToDocId(data.cfi))
  const now = FieldValue.serverTimestamp()
  const annotationData = {
    cfi: data.cfi,
    text: data.text,
    color: data.color,
    note: data.note || '',
    chapterTitle: data.chapterTitle || '',
    createdAt: now,
    updatedAt: now,
  }

  await docRef.create(annotationData)

  const createdDoc = await docRef.get()
  return convertFirestoreToAnnotation(docRef.id, createdDoc.data() as AnnotationFirestoreData)
}

export async function updateAnnotation(
  userWallet: string,
  nftClassId: string,
  annotationId: string,
  data: AnnotationUpdateData,
): Promise<Annotation | undefined> {
  const docRef = getAnnotationsCollection(userWallet, nftClassId).doc(annotationId)
  const doc = await docRef.get()

  if (!doc.exists) return undefined

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  }

  if (data.color !== undefined) {
    updateData.color = data.color
  }
  if (data.note !== undefined) {
    updateData.note = data.note || ''
  }

  await docRef.update(updateData)

  const updatedDoc = await docRef.get()
  return convertFirestoreToAnnotation(annotationId, updatedDoc.data() as AnnotationFirestoreData)
}

export async function deleteAnnotation(
  userWallet: string,
  nftClassId: string,
  annotationId: string,
): Promise<boolean> {
  const docRef = getAnnotationsCollection(userWallet, nftClassId).doc(annotationId)
  const doc = await docRef.get()

  if (!doc.exists) return false

  await docRef.delete()
  return true
}
