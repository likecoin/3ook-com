import { FetchError } from 'ofetch'

export function getErrorMessage(error: unknown) {
  if (error instanceof FetchError) {
    if (typeof error.data === 'string') {
      return error.data
    }
    if (error.data?.message) {
      return error.data.message
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return ''
}

export function getErrorStatusCode(error: unknown) {
  if (error instanceof FetchError) {
    return error.statusCode
  }
  return 400
}

export function getErrorURL(error: unknown) {
  if (error instanceof FetchError) {
    return error.response?.url
  }
  if (error instanceof Error && 'data' in error && error.data && typeof error.data === 'object' && 'url' in error.data) {
    return error.data.url as string
  }
  return undefined
}

export function parseError(error: unknown) {
  const message = getErrorMessage(error)
  const statusCode = getErrorStatusCode(error)
  const url = getErrorURL(error)
  return {
    message,
    statusCode,
    url,
  }
}
