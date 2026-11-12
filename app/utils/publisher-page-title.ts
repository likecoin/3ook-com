// Google shows about 600px of a title, roughly 30 CJK characters, so the
// description is capped there and the brand suffix is what gets cut instead.
export const PUBLISHER_PAGE_TITLE_DESCRIPTION_MAX_LENGTH = 30

// Unlike the shared truncateText, this counts code points and keeps partial words:
// CJK text has no spaces, so backing off to a word boundary can drop most of it.
function truncateByCodePoints(text: string, maxLength: number) {
  const chars = Array.from(text)
  if (chars.length <= maxLength) return text
  return `${chars.slice(0, maxLength - 1).join('').trimEnd()}…`
}

// Empty for a curated storefront, which keeps the listing title and voice pitch.
export function getPublisherPageTitle({
  displayName,
  description,
  isCurated,
  suffix,
}: {
  displayName: string
  description?: string
  isCurated?: boolean
  suffix: string
}) {
  if (isCurated) return ''
  const summary = truncateByCodePoints(
    (description || '').replace(/\s+/g, ' ').trim(),
    PUBLISHER_PAGE_TITLE_DESCRIPTION_MAX_LENGTH,
  )
  return [displayName, summary, suffix].filter(Boolean).join(' - ')
}
