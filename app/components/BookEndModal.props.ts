export type BookEndModalResult = 'collect' | 'dismiss'

export interface BookEndModalProps {
  // A borrowed Plus-library read gets the purchase upsell;
  // an owned one only gets told where the book went.
  isBorrowed?: boolean
}
