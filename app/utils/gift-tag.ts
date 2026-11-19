// The editor-managed CMS tag listing gifts and other non-book goods.
// Plus gifting is not a listing, so the store appends its CTA to this tag.
export const GIFT_TAG_ID = 'gift'

export function getIsGiftTagId(tagId: string): boolean {
  return tagId === GIFT_TAG_ID
}
