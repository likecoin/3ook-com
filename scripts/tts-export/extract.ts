import { Book } from '@likecoin/epub-ts/node'
import { mergeShortTTSSegments, splitTextIntoSegments } from '../../app/utils/tts'

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

const FOOTNOTE_CLASS_RE = /\b(footnote|endnote|fn\w*)\b/i
const FOOTNOTE_SUP_RE = /^\(?\d+\)?$/

/**
 * Node port of extractTTSSegments in app/pages/reader/epub.vue, kept
 * line-for-line comparable so segment text matches the reader byte for byte —
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

      const elements = Array.from(
        doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li'),
      ).filter((el) => {
        if (!el.textContent?.trim()) return false
        // Skip footnote/endnote sections (EPUB3 semantic roles or class-based)
        if (el.closest('[role="doc-endnotes"], [role="doc-footnote"]')) return false
        const ancestor = el.closest('section, aside')
        if (ancestor?.getAttribute('epub:type')?.match(/footnote|endnote/i)) return false
        if (FOOTNOTE_CLASS_RE.test(el.className || '')) return false
        return true
      })

      const isInlineFootnote = (node: Element): boolean => {
        // book.load() parses sections as XHTML, so tagName keeps the authored
        // case ('a', not 'A') — an uppercase compare here silently matched
        // nothing and let footnote markers be read aloud mid-sentence.
        const tagName = node.tagName?.toLowerCase()
        if (FOOTNOTE_CLASS_RE.test(node.className || '')) return true
        if (node.matches?.('a[role="doc-noteref"]')) return true
        if (node.classList?.contains('footnote-number')) return true
        if ((tagName === 'a' || tagName === 'span')
          && node.getAttribute('epub:type') === 'noteref') return true
        if (tagName === 'a') {
          const sup = node.querySelector(':scope > sup')
          if (sup && FOOTNOTE_SUP_RE.test(sup.textContent?.trim() || '')) return true
        }
        return false
      }

      elements.forEach((el, elIndex) => {
        let concatText = ''
        const walk = (node: Node): void => {
          if (node.nodeType === 3) {
            concatText += (node as Text).data || ''
            return
          }
          if (node.nodeType !== 1) return
          const child = node as Element
          if (isInlineFootnote(child)) return
          for (const c of Array.from(child.childNodes)) walk(c)
        }
        walk(el)

        const text = concatText.trim()
        if (!text) return

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
