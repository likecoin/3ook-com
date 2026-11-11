import { EpubCFI } from '@likecoin/epub-ts'

/**
 * Whether `cfi` lies within the page span bounded by `pageBoundA` and
 * `pageBoundB` (inclusive), without assuming which bound is the lower one.
 * epub.js can report a page's start cfi *after* its end cfi for a reflowable
 * chapter wedged between fixed-layout image spreads, so the membership test
 * must be order-agnostic. May throw on a malformed cfi (via `compare`);
 * callers guard with try/catch.
 */
export function isCFIWithinPageRange(
  epubCFI: EpubCFI,
  cfi: string,
  pageBoundA: string,
  pageBoundB: string,
): boolean {
  const a = epubCFI.compare(cfi, pageBoundA)
  const b = epubCFI.compare(cfi, pageBoundB)
  return (a >= 0 && b <= 0) || (a <= 0 && b >= 0)
}

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

const PRE_PAGINATED_PAGE_ATTRIBUTE = 'data-pre-paginated'
const VERTICAL_PAGE_ATTRIBUTE = 'data-vertical-writing'
const REFLOWABLE_HTML = `html:not([${PRE_PAGINATED_PAGE_ATTRIBUTE}])`
const HORIZONTAL_REFLOWABLE_HTML = `${REFLOWABLE_HTML}:not([${VERTICAL_PAGE_ATTRIBUTE}])`

export function markPrePaginatedPage(document: Document) {
  document.documentElement.setAttribute(PRE_PAGINATED_PAGE_ATTRIBUTE, '')
}

export function isPrePaginatedPage(document: Document) {
  return document.documentElement.hasAttribute(PRE_PAGINATED_PAGE_ATTRIBUTE)
}

// Pre-paginated pages keep their own writing mode, as forcing vertical-rl pushes their fixed-size box out of view;
// `:where()` keeps the specificity of a bare `html` / `body`, so the cascade against the book's own CSS is unchanged.
export function getWritingModeThemeRules(styles: Record<string, string>) {
  return { [`html:where(:not([${PRE_PAGINATED_PAGE_ATTRIBUTE}])), :where(${REFLOWABLE_HTML}) body`]: styles }
}

// A vertical page's frame spans the whole column flow, so `vh` and `%` resolve to several pages;
// read from <html>, as epub.js does when laying the page out.
export function markVerticalWritingPage(document: Document) {
  const writingMode = document.defaultView?.getComputedStyle(document.documentElement).writingMode
  document.documentElement.toggleAttribute(VERTICAL_PAGE_ATTRIBUTE, !!writingMode?.startsWith('vertical-'))
}

// Cap oversized illustrations to the page.
// Reflowable pages only: a pre-paginated page scales its own box to fit the frame,
// so a `vh` cap measures the frame instead and letterboxes the page.
export const IMAGE_CAP_THEME_RULES = {
  [`${REFLOWABLE_HTML} img, ${REFLOWABLE_HTML} svg`]: {
    height: 'auto !important',
  },
  [`${HORIZONTAL_REFLOWABLE_HTML} img, ${HORIZONTAL_REFLOWABLE_HTML} svg`]: {
    'max-width': '100% !important',
    'max-height': '90vh !important',
  },
}
