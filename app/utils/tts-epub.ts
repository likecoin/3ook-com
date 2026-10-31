const FOOTNOTE_CLASS_RE = /\b(footnote|endnote|fn\w*)\b/i
const FOOTNOTE_SUP_RE = /^\(?\d+\)?$/

// Numeric node types: the tts-export script runs this on linkedom in Node,
// where the browser's Node global doesn't exist.
const TEXT_NODE = 3
const ELEMENT_NODE = 1

// Tags that break the text flow. Books that skip <p> and write
// <div>text</div> (common in old Sigil books) used to be read only by their
// headings; any tag not listed here is treated as inline, so an unknown tag
// never splits a sentence.
const BLOCK_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li',
  'body', 'div', 'section', 'article', 'aside', 'main', 'header', 'footer', 'nav',
  'blockquote', 'figure', 'figcaption', 'pre', 'address',
  'ul', 'ol', 'dl', 'dt', 'dd',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption',
])

function isFootnote(node: Element): boolean {
  // book.load() parses sections as XHTML, so tagName keeps the authored
  // case ('a', not 'A') — an uppercase compare here silently matched
  // nothing and let footnote markers be read aloud mid-sentence.
  const tagName = node.tagName?.toLowerCase()
  if (FOOTNOTE_CLASS_RE.test(node.className || '')) return true
  // EPUB3 semantic roles
  if (node.matches?.('[role="doc-endnotes"], [role="doc-footnote"], a[role="doc-noteref"]')) return true
  const epubType = node.getAttribute('epub:type')
  if ((tagName === 'section' || tagName === 'aside') && epubType?.match(/footnote|endnote/i)) return true
  if ((tagName === 'a' || tagName === 'span') && epubType === 'noteref') return true
  if (node.classList?.contains('footnote-number')) return true
  if (tagName === 'a') {
    const sup = node.querySelector(':scope > sup')
    if (sup && FOOTNOTE_SUP_RE.test(sup.textContent?.trim() || '')) return true
  }
  return false
}

export interface TTSTextBlock {
  // Nearest block ancestor of the text, for an element-level CFI fallback
  element: Element
  // Untrimmed concatenation of textNodes
  text: string
  textNodes: Array<{ node: Text, startInConcat: number }>
}

/**
 * Splits a section document into the runs of text TTS reads, in reading
 * order. A run is the inline text between two block boundaries, so
 * `<div>a<blockquote>b</blockquote>c</div>` reads a, b, c rather than ac, b.
 * Footnote subtrees are skipped whole. The original DOM is walked (not a
 * clone) so callers can resolve text-node positions back to CFIs in the
 * section document. Every returned run has non-whitespace text.
 */
export function getTTSTextBlocks(doc: Document): TTSTextBlock[] {
  const blocks: TTSTextBlock[] = []
  let run: TTSTextBlock | undefined

  const flush = () => {
    if (run?.text.trim()) blocks.push(run)
    run = undefined
  }

  const walk = (node: Node, block: Element): void => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === TEXT_NODE) {
        const textNode = child as Text
        if (!textNode.data) continue
        run ??= { element: block, text: '', textNodes: [] }
        run.textNodes.push({ node: textNode, startInConcat: run.text.length })
        run.text += textNode.data
        continue
      }
      if (child.nodeType !== ELEMENT_NODE) continue
      const element = child as Element
      if (isFootnote(element)) continue
      if (BLOCK_TAGS.has(element.tagName.toLowerCase())) {
        flush()
        walk(element, element)
        flush()
      }
      else {
        walk(element, block)
      }
    }
  }

  const root = doc.querySelector('body') ?? doc.documentElement
  if (root) {
    walk(root, root)
    flush()
  }
  return blocks
}
