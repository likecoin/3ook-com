import {
  UPLOADED_BOOK_COVER_MAX_DIMENSION,
  UPLOADED_BOOK_COVER_MIME_TYPE,
  UPLOADED_BOOK_COVER_PICKER_TYPES,
} from '~/shared/utils/uploaded-book'

export interface ParsedBookCover {
  blob: Blob
  mimeType: string
}

export interface ParsedBookMetadata {
  title?: string
  cover?: ParsedBookCover
}

async function extractEPUBCover(book: {
  cover?: string
  packaging?: {
    coverPath?: string
    manifest?: Record<string, { href: string, type: string }>
  }
  archive?: { getBlob: (path: string) => Promise<Blob> | undefined }
}): Promise<Blob | undefined> {
  // `archive.getBlob` expects the archive-resolved path (`book.cover`);
  // `packaging.coverPath` is still needed as the manifest lookup key.
  const coverPath = book.packaging?.coverPath
  const resolvedCoverPath = book.cover
  const manifest = book.packaging?.manifest
  if (!coverPath || !resolvedCoverPath || !manifest || !book.archive) return undefined

  const manifestItem = Object.values(manifest).find(item => item.href === coverPath)
  const mimeType = manifestItem?.type
  if (!mimeType || !UPLOADED_BOOK_COVER_PICKER_TYPES.includes(mimeType)) {
    // Missing, SVG, or other unsupported cover — upload proceeds without one.
    return undefined
  }

  try {
    const blob = await book.archive.getBlob(resolvedCoverPath)
    return blob && blob.size > 0 ? blob : undefined
  }
  catch {
    return undefined
  }
}

async function resizeBookCover(raw: Blob | undefined): Promise<ParsedBookCover | undefined> {
  if (!raw) return undefined
  try {
    const resized = await resizeImageBlob(raw, UPLOADED_BOOK_COVER_MAX_DIMENSION)
    return { blob: resized, mimeType: UPLOADED_BOOK_COVER_MIME_TYPE }
  }
  catch {
    // Decode/resize failure — the source isn't a usable image. Drop the
    // cover rather than blocking the whole book upload.
    return undefined
  }
}

export async function parseEPUBMetadata(file: File): Promise<ParsedBookMetadata> {
  // Lazy-load so the rest of the bundle doesn't pay for @likecoin/epub-ts
  // until the user actually picks a file to upload.
  const { default: ePub } = await import('@likecoin/epub-ts')
  // Metadata-only; skip asset rewriting that races with our `book.destroy()`.
  const book = ePub({ replacements: 'none' })
  try {
    try {
      await book.open(file)
      await book.ready
    }
    catch {
      throw createError({ statusCode: 400, message: 'INVALID_EPUB' })
    }

    const rawTitle = (book.packaging?.metadata as { title?: string } | undefined)?.title
    const title = rawTitle?.trim() || undefined
    const rawCover = await extractEPUBCover(book)
    const cover = await resizeBookCover(rawCover)
    return { title, cover }
  }
  finally {
    book.destroy?.()
  }
}

export async function parsePDFMetadata(file: File): Promise<ParsedBookMetadata> {
  // Lazy-load pdfjs — same reason as the epub branch above.
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()

  const arrayBuffer = await file.arrayBuffer()
  let doc: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>
  try {
    doc = await pdfjs.getDocument({ data: arrayBuffer }).promise
  }
  catch {
    throw createError({ statusCode: 400, message: 'INVALID_PDF' })
  }

  try {
    const { info } = await doc.getMetadata()
    const rawTitle = (info as { Title?: string } | undefined)?.Title
    const title = rawTitle?.trim() || undefined
    return { title }
  }
  finally {
    doc.destroy()
  }
}

export async function parseBookMetadata(file: File): Promise<ParsedBookMetadata> {
  if (file.type === 'application/epub+zip') {
    return parseEPUBMetadata(file)
  }
  if (file.type === 'application/pdf') {
    return parsePDFMetadata(file)
  }
  throw createError({ statusCode: 400, message: 'INVALID_FILE_FORMAT' })
}
