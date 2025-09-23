import { Buffer } from 'node:buffer'

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
