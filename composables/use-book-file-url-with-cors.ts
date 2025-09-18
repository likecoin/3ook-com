export function useBookFileURLWithCORS() {
  const config = useRuntimeConfig()
  return function getBookFileURLWithCORS({
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
    const url = new URL(`${config.public.likeCoinAPIEndpoint}/ebook-cors/`)
    url.searchParams.set('class_id', nftClassId)
    if (nftId) url.searchParams.set('nft_id', nftId)
    url.searchParams.set('index', String(fileIndex))
    url.searchParams.set('custom_message', isCustomMessageEnabled && nftId ? '1' : '0')
    return url.toString()
  }
}
