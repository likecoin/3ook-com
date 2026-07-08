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
  // e.g. errors created by createError() carry their own statusCode
  if (error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode
  }
  return undefined
}

export function parseErrorData<T>(error: unknown, key: string): T | undefined {
  if (error instanceof Error && 'data' in error && error.data && typeof error.data === 'object') {
    const data = error.data as Record<string, unknown>
    if (key in data) {
      return data[key] as T
    }
  }
  return undefined
}

// A navigation/timeout-cancelled fetch surfaces as an `AbortError`/`TimeoutError`
// DOMException, which ofetch rewraps in a `<no response>` FetchError under
// `cause`. Benign (superseded, not failed), so callers can skip the error modal.
export function getIsAbortError(error: unknown): boolean {
  const isAbortName = (name?: string) => name === 'AbortError' || name === 'TimeoutError'
  // DOMException is not an Error subclass, and may be absent in some SSR/test
  // runtimes, so guard the global before the instanceof check.
  const isAbortLike = (e: unknown): boolean => {
    if (typeof DOMException !== 'undefined' && e instanceof DOMException) return isAbortName(e.name)
    return e instanceof Error && isAbortName(e.name)
  }
  if (isAbortLike(error)) return true
  if (error instanceof Error) {
    if (isAbortLike((error as { cause?: unknown }).cause)) return true
    if (/\baborted\b/i.test(error.message)) return true
  }
  return false
}

export function getErrorURL(error: unknown) {
  if (error instanceof FetchError) {
    return error.response?.url
  }
  return parseErrorData<string>(error, 'url')
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
