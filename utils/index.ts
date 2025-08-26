import { Buffer } from 'node:buffer'

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

export function getResizedNormalizedImageURL(imageURL: string, { size }: { size?: number } = {}) {
  const normalizedURL = normalizeURIToHTTP(imageURL)
  const resizedURL = getResizedImageURL(normalizedURL, { size })
  return resizedURL
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

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function getTimestampRoundedToMinute() {
  return Math.floor(Date.now() / 60000) * 60
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
  fileIndex: string | number
  isCustomMessageEnabled: boolean
}): string {
  const config = useRuntimeConfig()
  const url = new URL(`${config.public.likeCoinAPIEndpoint}/ebook-cors/`)
  url.searchParams.set('class_id', nftClassId)
  if (nftId) url.searchParams.set('nft_id', nftId)
  url.searchParams.set('index', String(fileIndex))
  url.searchParams.set('custom_message', isCustomMessageEnabled && nftId ? '1' : '0')
  return url.toString()
}

const DATA_URI_REGEX = /^data:application\/json(?:; ?charset=utf-8|; ?utf8)?(;base64)?,/i

export function parseURIString<T>(uri: string): T | undefined {
  let dataString = uri
  const match = dataString?.match(DATA_URI_REGEX)
  if (!match) return undefined

  const isBase64 = !!match[1]
  dataString = dataString.replace(DATA_URI_REGEX, '')
  if (isBase64) {
    dataString = Buffer.from(dataString, 'base64').toString('utf-8')
  }
  try {
    const data = JSON.parse(dataString)
    return data
  }
  catch {
    return undefined
  }
}
