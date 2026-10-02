// The editor-managed CMS tag listing e-readers and other non-book goods.
// Plus gifting is not a listing, so the store appends its CTA to this tag.
export const EINK_READER_TAG_ID = 'eink-reader'

export function getIsEinkReaderTagId(tagId: string): boolean {
  return tagId === EINK_READER_TAG_ID
}
