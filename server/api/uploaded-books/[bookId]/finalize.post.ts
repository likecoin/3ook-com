import type { UploadedBookMeta } from '~/shared/types/uploaded-book'
import {
  UPLOADED_BOOK_CONTENT_TYPE_TO_MIME,
  UPLOADED_BOOK_COVER_EXT,
  UPLOADED_BOOK_COVER_MIME_TYPE,
  UPLOADED_BOOK_MAX_COVER_SIZE,
  UPLOADED_BOOK_MAX_FILE_SIZE,
} from '~/shared/utils/uploaded-book'
import {
  FinalizeUploadedBookBodySchema,
  UPLOADED_BOOK_MAX_NAME_LENGTH,
  UploadedBookIdParamsSchema,
} from '~/server/schemas/uploaded-book'

// PK\x03\x04 (standard zip) or PK\x05\x06 (empty zip) or PK\x07\x08 (spanned zip)
const ZIP_MAGIC_PREFIX = Buffer.from([0x50, 0x4B])
const PDF_MAGIC = Buffer.from('%PDF-', 'ascii')
// JPEG SOI marker; the cover is always re-encoded to JPEG client-side.
const JPEG_MAGIC = Buffer.from([0xFF, 0xD8, 0xFF])

export default defineEventHandler(async (event): Promise<UploadedBookMeta> => {
  const wallet = await requireUserWallet(event)
  const session = await requireUserSession(event)
  if (!session.user.isLikerPlus) {
    throw createError({ statusCode: 402, message: 'REQUIRE_LIKER_PLUS' })
  }

  const { bookId } = await getValidatedRouterParams(event, createValidator(UploadedBookIdParamsSchema))
  const { contentType, name, hasCover } = await readValidatedBody(event, createValidator(FinalizeUploadedBookBodySchema))

  const bucket = getUploadedBooksStorageBucket()
  if (!bucket) {
    throw createError({ statusCode: 500, message: 'STORAGE_NOT_CONFIGURED' })
  }

  const expectedMime = UPLOADED_BOOK_CONTENT_TYPE_TO_MIME[contentType]
  const storagePath = getUploadedBookStoragePath(wallet, bookId, contentType)
  const file = bucket.file(storagePath)

  const safeDelete = async (target: typeof file) => {
    try {
      await target.delete({ ignoreNotFound: true })
    }
    catch (err) {
      console.warn(`Failed to delete orphaned uploaded book file: ${target.name}`, err)
    }
  }

  // Parallelise the two GCS round-trips: metadata (for size/contentType) and
  // the first 8 bytes (for magic-number sniff). Neither depends on the other.
  const readMagicBytes = async (): Promise<Buffer> => {
    const chunks: Buffer[] = []
    for await (const chunk of file.createReadStream({ start: 0, end: 7 })) {
      chunks.push(chunk as Buffer)
    }
    return Buffer.concat(chunks)
  }

  let metadataSize: number
  let metadataContentType: string | undefined
  let head: Buffer
  try {
    const [[metadata], magicBytes] = await Promise.all([
      file.getMetadata(),
      readMagicBytes(),
    ])
    // GCS returns size as string; normalise to number.
    metadataSize = typeof metadata.size === 'string' ? Number(metadata.size) : (metadata.size ?? 0)
    metadataContentType = metadata.contentType
    head = magicBytes
  }
  catch (err: unknown) {
    const code = (err as { code?: number })?.code
    if (code === 404) {
      throw createError({ statusCode: 400, message: 'UPLOAD_NOT_FOUND' })
    }
    throw err
  }

  if (!Number.isFinite(metadataSize) || metadataSize <= 0) {
    await safeDelete(file)
    throw createError({ statusCode: 400, message: 'UPLOAD_NOT_FOUND' })
  }
  if (metadataSize > UPLOADED_BOOK_MAX_FILE_SIZE) {
    await safeDelete(file)
    throw createError({ statusCode: 400, message: 'FILE_TOO_LARGE' })
  }
  if (metadataContentType !== expectedMime) {
    await safeDelete(file)
    throw createError({ statusCode: 400, message: 'INVALID_FILE_FORMAT' })
  }

  // Magic-number sniff so a client can't upload a renamed file under a
  // trusted content-type.
  const magicOk = contentType === 'pdf'
    ? head.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)
    : head.subarray(0, ZIP_MAGIC_PREFIX.length).equals(ZIP_MAGIC_PREFIX)
  if (!magicOk) {
    await safeDelete(file)
    throw createError({ statusCode: 400, message: 'INVALID_FILE_FORMAT' })
  }

  // Cover verification is best-effort: if anything's off we drop the cover
  // and proceed without one rather than failing the whole book upload.
  let coverURL: string | undefined
  let coverStoragePath: string | undefined
  if (hasCover) {
    const candidatePath = getUploadedBookCoverStoragePath(wallet, bookId, UPLOADED_BOOK_COVER_EXT)
    const coverFile = bucket.file(candidatePath)
    try {
      const [[coverMeta], coverHead] = await Promise.all([
        coverFile.getMetadata(),
        (async () => {
          const chunks: Buffer[] = []
          for await (const chunk of coverFile.createReadStream({ start: 0, end: 3 })) {
            chunks.push(chunk as Buffer)
          }
          return Buffer.concat(chunks)
        })(),
      ])
      const coverSize = typeof coverMeta.size === 'string' ? Number(coverMeta.size) : (coverMeta.size ?? 0)
      const coverMimeOk = coverMeta.contentType === UPLOADED_BOOK_COVER_MIME_TYPE
      const coverSizeOk = Number.isFinite(coverSize) && coverSize > 0 && coverSize <= UPLOADED_BOOK_MAX_COVER_SIZE
      const coverMagicOk = coverHead.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC)
      if (coverMimeOk && coverSizeOk && coverMagicOk) {
        const token = generateFirebaseDownloadToken()
        await coverFile.setMetadata({
          metadata: { firebaseStorageDownloadTokens: token },
        })
        coverURL = getFirebaseStorageDownloadURL(bucket.name, candidatePath, token)
        coverStoragePath = candidatePath
      }
      else {
        await safeDelete(coverFile)
      }
    }
    catch (err) {
      console.warn(`Cover verification failed for ${candidatePath}, dropping cover`, err)
      await safeDelete(coverFile)
    }
  }

  const bookName = name.slice(0, UPLOADED_BOOK_MAX_NAME_LENGTH)

  try {
    return await createUploadedBook(wallet, {
      id: bookId,
      name: bookName,
      contentType,
      fileSize: metadataSize,
      storagePath,
      coverURL,
      coverStoragePath,
    })
  }
  catch (error) {
    await safeDelete(file)
    if (coverStoragePath) {
      await safeDelete(bucket.file(coverStoragePath))
    }
    throw error
  }
})
