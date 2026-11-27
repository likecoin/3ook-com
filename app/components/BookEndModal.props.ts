export type BookEndModalResult = 'collect' | 'explore' | 'dismiss'

export interface BookEndModalProps {
  nftClassId: string
  // A borrowed library read gets the purchase card;
  // an owned one only gets told where the book went.
  isBorrowed?: boolean
}
