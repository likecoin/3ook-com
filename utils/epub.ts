import { EpubCFI } from '@likecoin/epub-ts'

/**
 * Walk forward from the given CFI position in the EPUB section document
 * and return up to `maxLength` chars of text.
 */
export function getExcerptForCFI(
  doc: Document,
  cfi: string,
  maxLength: number,
): string {
  try {
    const range = new EpubCFI(cfi).toRange(doc)
    if (!range) return ''
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
    walker.currentNode = range.endContainer
    let text = ''
    if (range.endContainer.nodeType === Node.TEXT_NODE) {
      text += (range.endContainer.textContent || '').slice(range.endOffset)
    }
    let node: Node | null
    while (text.length < maxLength && (node = walker.nextNode())) {
      text += node.textContent || ''
    }
    return text.replace(/\s+/g, ' ').trim().slice(0, maxLength)
  }
  catch (error) {
    console.warn('Failed to extract excerpt for CFI:', error)
    return ''
  }
}
