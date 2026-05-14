import { createHash } from 'node:crypto'
import { FieldValue, Timestamp, type UpdateData, type WithFieldValue } from 'firebase-admin/firestore'

import { ANNOTATION_COLORS_MAP } from '~~/shared/constants/annotations'
import type { AnnotationFirestoreData } from '~~/server/types/annotation'

function getAnnotationDocId(data: AnnotationCreateData): string {
  // Highlights use the legacy sha256(cfi) scheme to stay compatible with documents created before bookmarks existed.
  if (data.type === 'highlight') {
    if (!data.cfi) throw createError({ statusCode: 400, message: 'HIGHLIGHT_MISSING_CFI' })
    return createHash('sha256').update(data.cfi).digest('hex')
  }
  if ((data.cfi !== undefined) === (data.page !== undefined)) {
    throw createError({ statusCode: 400, message: 'BOOKMARK_MISSING_ANCHOR' })
  }
  const anchor = data.cfi !== undefined ? `cfi:${data.cfi}` : `page:${data.page}`
  return createHash('sha256').update(`${data.type}:${anchor}`).digest('hex')
}

function getAnnotationsCollection(userWallet: string, nftClassId: string) {
  return getUserCollection()
    .doc(userWallet)
    .collection('books')
    .doc(nftClassId.toLowerCase())
    .collection('annotations') as FirebaseFirestore.CollectionReference<AnnotationFirestoreData>
}

function convertFirestoreToAnnotation(docId: string, data: AnnotationFirestoreData): Annotation {
  const type: AnnotationType = data.type === 'bookmark' ? 'bookmark' : 'highlight'
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now()
  const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : Date.now()
  return {
    id: docId,
    type,
    ...(data.cfi !== undefined ? { cfi: data.cfi } : {}),
    ...(data.page !== undefined ? { page: data.page } : {}),
    ...(data.text !== undefined ? { text: data.text } : {}),
    ...(data.color !== undefined ? { color: data.color } : {}),
    ...(data.note !== undefined ? { note: data.note } : {}),
    chapterTitle: data.chapterTitle || '',
    createdAt,
    updatedAt,
  }
}

export async function getAnnotations(
  userWallet: string,
  nftClassId: string,
): Promise<Annotation[]> {
  const snapshot = await getAnnotationsCollection(userWallet, nftClassId)
    .orderBy('createdAt', 'asc')
    .get()

  return snapshot.docs.map(doc => convertFirestoreToAnnotation(doc.id, doc.data()))
}

export async function createAnnotation(
  userWallet: string,
  nftClassId: string,
  data: AnnotationCreateData,
): Promise<Annotation> {
  const collection = getAnnotationsCollection(userWallet, nftClassId)
  const docRef = collection.doc(getAnnotationDocId(data))
  const now = FieldValue.serverTimestamp()

  const annotationData: WithFieldValue<AnnotationFirestoreData> = {
    type: data.type,
    chapterTitle: data.chapterTitle || '',
    createdAt: now,
    updatedAt: now,
    ...(data.cfi !== undefined ? { cfi: data.cfi } : {}),
    ...(data.page !== undefined ? { page: data.page } : {}),
    ...(data.text !== undefined ? { text: data.text } : {}),
    ...(data.color !== undefined ? { color: data.color } : {}),
    ...(data.note !== undefined ? { note: data.note } : {}),
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

  const updateData: UpdateData<AnnotationFirestoreData> = {
    updatedAt: FieldValue.serverTimestamp(),
    ...(data.color !== undefined ? { color: data.color } : {}),
    ...(data.note !== undefined ? { note: data.note || '' } : {}),
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
    const selectors: Record<string, unknown>[] = []
    if (annotation.cfi) {
      selectors.push({
        '@type': 'oa:FragmentSelector',
        'value': annotation.cfi,
      })
    }
    else if (annotation.page !== undefined) {
      selectors.push({
        '@type': 'oa:FragmentSelector',
        'value': `page=${annotation.page}`,
      })
    }
    if (annotation.text) {
      selectors.push({
        '@type': 'oa:TextQuoteSelector',
        'exact': annotation.text,
      })
    }

    const target: Record<string, unknown> = {
      '@type': 'oa:SpecificResource',
      'hasSource': {
        '@type': 'dctypes:Text',
        'uniqueIdentifier': nftClassId,
        'dc:title': title,
      },
      'hasSelector': selectors,
    }
    if (annotation.color) {
      target.styleClass = annotation.color
    }

    let motivatedBy: string
    if (annotation.type === 'bookmark') {
      motivatedBy = 'oa:bookmarking'
    }
    else if (annotation.note) {
      motivatedBy = 'oa:commenting'
    }
    else {
      motivatedBy = 'oa:highlighting'
    }

    const oa: Record<string, unknown> = {
      '@id': `urn:uuid:${annotation.id}`,
      '@type': 'oa:Annotation',
      'motivatedBy': motivatedBy,
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
