// Wire contract for a book file's byte size. Large files can't carry a real
// `content-length` — a fixed-length body would hit Cloud Run's 32 MiB response
// cap — so the size travels in this header instead. Both sides MUST go through
// this symbol: a mismatch degrades silently to chunk accumulation (~2x peak
// memory) with no error. Also emitted by the LikeCoin API's /ebook-cors/.
export const ORIGINAL_CONTENT_LENGTH_HEADER = 'x-original-content-length'

// Set to '1' by /ebook-cors/ when the book has a custom message page that can't
// be generated yet (the purchase memo is not indexed), so the file lacks it.
export const CUSTOM_MESSAGE_PENDING_HEADER = 'x-custom-message-pending'
