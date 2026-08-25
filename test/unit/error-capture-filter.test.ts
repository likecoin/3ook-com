import { describe, expect, it } from 'vitest'
import {
  getIsIgnoredCapturedException,
  getIsLocalhostHostname,
  normalizeCapturedExceptionMessage,
} from '~/utils/error-capture-filter'

describe('getIsIgnoredCapturedException', () => {
  it('drops WalletConnect IndexedDB teardown', () => {
    expect(getIsIgnoredCapturedException({
      value: 'Failed to execute \'transaction\' on \'IDBDatabase\': The database connection is closing.',
      mechanism: { synthetic: false },
    })).toBe(true)
  })

  // The four shapes WalletConnect's pino logger produced in production; all
  // reported synthetic: true, none carried a message worth triaging.
  it.each([
    'Object captured as exception with keys: level, time',
    'Object captured as exception with keys: context, level, msg, time',
    'Object captured as exception with keys: level, msg, time',
    'Object captured as exception with keys: context, level, time',
  ])('drops synthetic object-captured exception: %s', (value) => {
    expect(getIsIgnoredCapturedException({ value, mechanism: { synthetic: true } })).toBe(true)
  })

  it('keeps a non-synthetic object-captured exception', () => {
    // The EMAIL_ALREADY_USED shape thrown by our own code — a real bug.
    expect(getIsIgnoredCapturedException({
      value: 'Object captured as exception with keys: data, statusCode',
      mechanism: { synthetic: false },
    })).toBe(false)
  })

  it('keeps an object-captured exception with no mechanism reported', () => {
    expect(getIsIgnoredCapturedException({
      value: 'Object captured as exception with keys: data, statusCode',
    })).toBe(false)
  })

  it('matches the marker when posthog prefixes a class name', () => {
    expect(getIsIgnoredCapturedException({
      value: '\'Foo\' captured as exception with keys: level, time',
      mechanism: { synthetic: true },
    })).toBe(true)
  })

  it('keeps ordinary application errors', () => {
    expect(getIsIgnoredCapturedException({
      value: 'TypeError: Cannot read properties of undefined (reading \'packaging\')',
      mechanism: { synthetic: false },
    })).toBe(false)
  })
})

describe('normalizeCapturedExceptionMessage', () => {
  it('collapses epub-ts Range logs that differ only by DOM offset', () => {
    const build = (offset: number) =>
      `setting end offset to start container length failed IndexSizeError: Failed to execute 'setEnd' on 'Range': There is no child at offset ${offset}.`
    const normalized = [2, 3, 117].map(o => normalizeCapturedExceptionMessage(build(o)))
    expect(new Set(normalized).size).toBe(1)
    expect(normalized[0]).toContain('There is no child at offset <offset>.')
  })

  it('leaves unrelated messages untouched', () => {
    const message = 'TypeError: Failed to fetch'
    expect(normalizeCapturedExceptionMessage(message)).toBe(message)
  })
})

describe('getIsLocalhostHostname', () => {
  it.each(['localhost', '127.0.0.1', '[::1]'])('treats %s as local', (hostname) => {
    expect(getIsLocalhostHostname(hostname)).toBe(true)
  })

  it('treats the production host as remote', () => {
    expect(getIsLocalhostHostname('3ook.com')).toBe(false)
  })
})
