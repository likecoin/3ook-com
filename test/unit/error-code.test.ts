import { RpcRequestError } from 'viem'
import { FetchError } from 'ofetch'
import { describe, expect, it } from 'vitest'
import { getErrorCode, getErrorEventMessage } from '~/utils/error'

function createFetchError(statusCode: number, data?: unknown) {
  const error = new FetchError('fetch failed')
  Object.assign(error, { statusCode, data })
  return error
}

describe('getErrorCode', () => {
  it('prefers a numeric `code`, as carried by Magic SDK RPC errors', () => {
    const error = Object.assign(new Error('Internal error'), { code: -32603 })
    expect(getErrorCode(error)).toBe(-32603)
  })

  it('prefers a string `code`, as carried by network-level errors', () => {
    const error = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
    expect(getErrorCode(error)).toBe('ECONNREFUSED')
  })

  it('falls back to the status code of a FetchError', () => {
    expect(getErrorCode(createFetchError(401, { message: 'UNAUTHORIZED' }))).toBe(401)
  })

  it('prefers `code` over a status code when both are present', () => {
    const error = Object.assign(new Error('RPC failed'), { code: 4001, statusCode: 500 })
    expect(getErrorCode(error)).toBe(4001)
  })

  it('falls back to the status code of a createError()-style error', () => {
    const error = Object.assign(new Error('Connect wallet failed'), { statusCode: 400 })
    expect(getErrorCode(error)).toBe(400)
  })

  it('falls back to the error name, as carried by viem/wagmi errors', () => {
    const error = new Error('Connector not connected')
    error.name = 'ConnectorNotConnectedError'
    expect(getErrorCode(error)).toBe('ConnectorNotConnectedError')
  })

  it('ignores a non-primitive `code`', () => {
    const error = Object.assign(new Error('weird'), { code: { nested: true } })
    expect(getErrorCode(error)).toBe('Error')
  })

  it('returns undefined for non-Error values', () => {
    expect(getErrorCode('some string')).toBeUndefined()
    expect(getErrorCode(undefined)).toBeUndefined()
  })
})

describe('getErrorEventMessage', () => {
  // The shape wagmi's signMessageAsync throws when the RPC transport fails: viem
  // folds the signed payload into `message`, so only `shortMessage` is safe to log.
  const rpcError = new RpcRequestError({
    body: { method: 'personal_sign', params: ['0xdeadbeef', '0xX_WALLET'] },
    error: { code: -32603, message: 'Internal JSON-RPC error' },
    url: 'https://mainnet.base.org',
  })

  it('keeps the wallet and signed payload out of a viem error message', () => {
    expect(rpcError.message).toContain('0xX_WALLET')
    const eventMessage = getErrorEventMessage(rpcError)
    expect(eventMessage).toBe(rpcError.shortMessage)
    expect(eventMessage).not.toContain('0xX_WALLET')
  })

  it('leaves the RPC code recoverable via getErrorCode', () => {
    expect(getErrorCode(rpcError)).toBe(-32603)
  })

  it('falls back to the plain message for non-viem errors', () => {
    expect(getErrorEventMessage(createFetchError(401, { message: 'UNAUTHORIZED' }))).toBe('UNAUTHORIZED')
    expect(getErrorEventMessage(new Error('Connect wallet failed'))).toBe('Connect wallet failed')
  })

  it('truncates to GA4\'s 100-character parameter limit', () => {
    expect(getErrorEventMessage(new Error('a'.repeat(250)))).toHaveLength(100)
  })

  it('returns an empty string for non-Error values', () => {
    expect(getErrorEventMessage(undefined)).toBe('')
  })
})
