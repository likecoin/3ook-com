// Non-book goods (e-ink readers, merch, gift codes) reuse the book listing
// pipeline, so every listing carries a discriminator instead of living in a
// parallel catalogue. Absent means 'book': only goods are ever tagged.
declare type BookProductType = 'book' | 'goods'

// How a purchase reaches the buyer. 'digital' is the book default (claim/read),
// 'shipping' needs a postal address, 'code' is emailed.
declare type BookFulfilmentType = 'digital' | 'shipping' | 'code'
