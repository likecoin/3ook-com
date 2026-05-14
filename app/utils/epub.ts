import { EpubCFI } from '@likecoin/epub-ts'

/**
 * Resolve the first text node at or after the DOM position (container, offset).
 * For element containers, `offset` indexes into childNodes per the DOM Range spec,
 * so we advance to the child at that index (or past the container entirely).
 */
function resolveStartTextNode(
  walker: TreeWalker,
  container: Node,
  offset: number,
): { startNode: Node | null, startOffset: number } {
  if (container.nodeType === Node.TEXT_NODE) {
    return { startNode: container, startOffset: offset }
  }
  const child = container.childNodes[offset]
  if (child) {
    if (child.nodeType === Node.TEXT_NODE) {
      return { startNode: child, startOffset: 0 }
    }
    walker.currentNode = child
    return { startNode: walker.nextNode(), startOffset: 0 }
  }
  walker.currentNode = container
  let node: Node | null = walker.nextNode()
  while (node && container.contains(node)) {
    node = walker.nextNode()
  }
  return { startNode: node, startOffset: 0 }
}

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
    const { startNode, startOffset } = resolveStartTextNode(
      walker,
      range.endContainer,
      range.endOffset,
    )
    let text = ''
    let remaining = maxLength
    if (startNode) {
      walker.currentNode = startNode
      const chunk = (startNode.textContent || '').slice(startOffset, startOffset + remaining)
      text += chunk
      remaining -= chunk.length
    }
    let node: Node | null
    while (remaining > 0 && (node = walker.nextNode())) {
      const chunk = (node.textContent || '').slice(0, remaining)
      text += chunk
      remaining -= chunk.length
    }
    return text.replace(/\s+/g, ' ').trim().slice(0, maxLength)
  }
  catch (error) {
    console.warn('Failed to extract excerpt for CFI:', error)
    return ''
  }
}
