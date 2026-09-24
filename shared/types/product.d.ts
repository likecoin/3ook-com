// Non-book products (merch today; gift codes later) reuse the book listing
// pipeline, so every listing carries a discriminator instead of living in a
// parallel catalogue. Absent means 'book': only non-book listings are tagged.
declare type BookProductType = 'book' | 'merch'

// Optional per-locale copy beside a plain listing string, which stays the
// fallback. `zh` is one bucket, as in the CMS tags.
declare interface BookLocalizedCopy {
  en?: string
  zh?: string
}
