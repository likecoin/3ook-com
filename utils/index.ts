export function normalizeURIToHTTP(url?: string) {
  if (!url) return ''
  const config = useRuntimeConfig()
  const [schema, path] = url.split('://')
  if (schema === 'ar') return `${config.public.arweaveEndpoint}/${path}`
  if (schema === 'ipfs') return `${config.public.ipfsEndpoint}/${path}`
  return url
}

export function getResizedImageURL(imageURL: string, { size }: { size?: number } = {}) {
  if (!imageURL) return ''

  const config = useRuntimeConfig()
  const params = new URLSearchParams()
  params.set('url', imageURL)
  if (size) params.set('width', size.toString())
  return `${config.public.likeCoinStaticEndpoint}/thumbnail/?${params.toString()}`
}

export function extractContentTypeFromURL(url: string) {
  if (url?.includes('epub')) return 'epub'
  if (url?.includes('pdf')) return 'pdf'
  return 'unknown'
}

export function extractFilenameFromContentURL(url: string) {
  if (!url) return ''
  const urlObj = new URL(url)
  return urlObj.searchParams.get('name') || ''
}

export function getLikerLandV2NFTClassPageURL(nftClassId: string) {
  const config = useRuntimeConfig()
  return `${config.public.likerLandV2URL}/nft/class/${nftClassId}`
}

export function getRouteQuery(key: string, defaultValue = '') {
  const route = useRoute()
  const value = route.query[key]
  return (Array.isArray(value) ? value[0] : value) || defaultValue
}

export function getRouteParam(key: string, defaultValue = '') {
  const route = useRoute()
  const value = route.params[key]
  return (Array.isArray(value) ? value[0] : value) || defaultValue
}

export function checkIsEVMAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const CONTENT_URL_TYPE_ORDER = ['epub', 'pdf']

export function compareContentURL(
  a: ContentURL,
  b: ContentURL,
) {
  const indexA = CONTENT_URL_TYPE_ORDER.indexOf(a.type ?? '')
  const indexB = CONTENT_URL_TYPE_ORDER.indexOf(b.type ?? '')

  if (indexA === -1 && indexB === -1) {
    return a.name.localeCompare(b.name)
  }
  else if (indexA === -1) {
    return 1
  }
  else if (indexB === -1) {
    return -1
  }
  else {
    return indexA - indexB
  }
}

export function getBookFileURLWithCORS({
  nftClassId,
  nftId,
  fileIndex,
  isCustomMessageEnabled,
}: {
  nftClassId: string
  nftId: string | undefined
  fileIndex: string
  isCustomMessageEnabled: boolean
}): string {
  const config = useRuntimeConfig()
  const url = new URL(`${config.public.likeCoinAPIEndpoint}/ebook-cors/`)
  url.searchParams.set('class_id', nftClassId)
  if (nftId) url.searchParams.set('nft_id', nftId)
  url.searchParams.set('index', fileIndex)
  url.searchParams.set('custom_message', isCustomMessageEnabled && nftId ? '1' : '0')
  return url.toString()
}
