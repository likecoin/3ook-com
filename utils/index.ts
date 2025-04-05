export function normalizeURIToHTTP(url: string) {
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
  return undefined
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
