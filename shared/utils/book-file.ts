// Wire contract for a book file's byte size. Large files can't carry a real
// `content-length` — a fixed-length body would hit Cloud Run's 32 MiB response
// cap — so the size travels in this header instead. Both sides MUST go through
// this symbol: a mismatch degrades silently to chunk accumulation (~2x peak
// memory) with no error. Also emitted by the LikeCoin API's /ebook-cors/.
export const ORIGINAL_CONTENT_LENGTH_HEADER = 'x-original-content-length'
