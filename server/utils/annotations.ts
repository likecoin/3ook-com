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
    .collection('annotations') as FirebaseFirestore.CollectionReference<AnnotationFirestoreData>
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
    return convertFirestoreToAnnotation(doc.id, doc.data())
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
  return convertFirestoreToAnnotation(docRef.id, createdDoc.data()!)
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
  return convertFirestoreToAnnotation(annotationId, updatedDoc.data()!)
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

/**
 * Convert annotations to Open Annotation (OA) JSON-LD collection format.
 * Ref: https://idpf.org/epub/oa
 */
export function composeOpenAnnotationCollection({
  nftClassId,
  title,
  annotations,
}: {
  nftClassId: string
  title: string
  annotations: Annotation[]
}) {
  const config = useRuntimeConfig()

  const styleClasses = Object.entries(ANNOTATION_COLORS_MAP)
    .map(([name, rgba]) => `.${name} { background-color: ${rgba}; }`)
    .join(' ')

  const oaAnnotations = annotations.map((annotation) => {
    const target: Record<string, unknown> = {
      '@type': 'oa:SpecificResource',
      'hasSource': {
        '@type': 'dctypes:Text',
        'uniqueIdentifier': nftClassId,
        'dc:title': title,
      },
      'hasSelector': [
        {
          '@type': 'oa:FragmentSelector',
          'value': annotation.cfi,
        },
        {
          '@type': 'oa:TextQuoteSelector',
          'exact': annotation.text,
        },
      ],
      'styleClass': annotation.color,
    }

    const oa: Record<string, unknown> = {
      '@id': `urn:uuid:${annotation.id}`,
      '@type': 'oa:Annotation',
      'motivatedBy': annotation.note ? 'oa:commenting' : 'oa:highlighting',
      'hasTarget': target,
      'annotatedAt': new Date(annotation.createdAt).toISOString(),
    }

    if (annotation.note) {
      const escapedNote = annotation.note
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '<br/>')
      oa.hasBody = {
        '@type': 'dctypes:Text',
        'format': 'application/xhtml+xml',
        'chars': `<div xmlns='http://www.w3.org/1999/xhtml'>${escapedNote}</div>`,
      }
    }

    return oa
  })

  const latestUpdatedAt = annotations.reduce(
    (max, a) => Math.max(max, a.updatedAt),
    0,
  )

  return {
    '@context': 'http://www.idpf.org/epub/oa/1.0/context.json',
    '@id': `${config.public.baseURL}/store/${nftClassId}`,
    '@type': 'epub:AnnotationCollection',
    'dc:title': title,
    'dcterms:modified': latestUpdatedAt
      ? new Date(latestUpdatedAt).toISOString()
      : new Date().toISOString(),
    'styledBy': {
      '@type': 'oa:CssStyle',
      'format': 'text/css',
      'chars': styleClasses,
    },
    'annotations': oaAnnotations,
  }
}
