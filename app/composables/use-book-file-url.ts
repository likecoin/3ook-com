export function useBookFileURL() {
  return function getBookFileURL({
    nftClassId,
    nftId,
    fileIndex,
    isCustomMessageEnabled,
  }: {
    nftClassId: string
    nftId: string | undefined
    fileIndex: string | number
    isCustomMessageEnabled: boolean
  }): string {
    // Points at our same-origin proxy (`server/api/book-file.get.ts`), which
    // attaches the upstream Bearer token server-side. Built as a relative URL
    // (no `window`) so it is safe to evaluate during SSR; the loader fetches it
    // same-origin, so the session cookie is sent automatically.
    const params = new URLSearchParams()
    params.set('class_id', nftClassId)
    if (nftId) params.set('nft_id', nftId)
    params.set('index', String(fileIndex))
    params.set('custom_message', isCustomMessageEnabled && nftId ? '1' : '0')
    return `/api/book-file?${params.toString()}`
  }
}
