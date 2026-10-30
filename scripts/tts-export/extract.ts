import { Book } from '@likecoin/epub-ts/node'
import { mergeShortTTSSegments, splitTextIntoSegments } from '../../app/utils/tts'
import { getTTSTextBlocks } from '../../app/utils/tts-epub'

export interface ExportSegment {
  id: string
  text: string
  sectionIndex: number
  elementIndex: number
}

export interface ExtractResult {
  segments: ExportSegment[]
  chapterTitles: Record<number, string>
}

/**
 * Node port of extractTTSSegments in app/pages/reader/epub.vue: text comes
 * from the same getTTSTextBlocks, so segment text matches the reader byte for byte —
 * the equality --write-cache depends on. Two text-neutral deviations: no CFI
 * (only ever fed the reader's `cfi` field), and a duck-typed document check,
 * since linkedom's Document is a different class identity than the browser's.
 */
export async function extractTTSSegments(epub: Buffer | ArrayBuffer): Promise<ExtractResult> {
  // A Node Buffer is a Uint8Array, not an ArrayBuffer, so epub-ts's type
  // detection mistakes it for a URL and hangs on a fetch that never resolves.
  const input = Buffer.isBuffer(epub)
    ? epub.buffer.slice(epub.byteOffset, epub.byteOffset + epub.byteLength) as ArrayBuffer
    : epub
  const book = new Book(input)
  await book.opened

  const sections: Array<{ href?: string, index?: number }> = []
  book.spine!.each((section: { href?: string, index?: number }) => {
    sections.push(section)
  })

  const segments: ExportSegment[] = []
  const chapterTitles: Record<number, string> = {}

  for (const section of sections) {
    try {
      if (!section.href) continue
      const chapter = await book.load(section.href)

      if (!chapter || typeof (chapter as Document).querySelectorAll !== 'function') {
        console.warn(`No document found for section ${section.href}`)
        continue
      }
      const doc = chapter as Document

      const titleText = doc.querySelector('title')?.textContent?.trim() || ''
      const chapterTitle = (titleText && titleText.toLowerCase() !== 'unknown' && titleText !== '未知')
        ? titleText
        : doc.querySelector('h1, h2, h3')?.textContent?.trim() || ''
      chapterTitles[section.index ?? 0] = chapterTitle

      getTTSTextBlocks(doc).forEach((block, elIndex) => {
        const text = block.text.trim()

        splitTextIntoSegments(text).forEach((segmentText, segIndex) => {
          segments.push({
            text: segmentText,
            id: `${section.index}-${elIndex}-${segIndex}`,
            sectionIndex: section.index ?? 0,
            elementIndex: elIndex,
          })
        })
      })
    }
    catch (err) {
      console.warn(`Failed to load section ${section.href}`, err)
    }
  }

  return { segments: mergeShortTTSSegments(segments) as ExportSegment[], chapterTitles }
}
