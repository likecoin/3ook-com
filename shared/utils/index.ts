import { getAddress } from 'viem'

export function checkIsEVMAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export function getHasEVMAddressPrefix(value: string) {
  return value.startsWith('0x')
}

// Wallet addresses are compared in checksummed (EIP-55) form, unlike NFT class
// IDs which are lowercased. Returns '' for anything that isn't an EVM address.
export function checksumEVMAddress(address?: string) {
  if (!address || !checkIsEVMAddress(address)) return ''
  return getAddress(address)
}

export function normalizeNFTClassId(id?: string) {
  return id?.toLowerCase() ?? ''
}

export function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw signal.reason ?? new DOMException('Aborted', 'AbortError')
  }
}

/**
 * Run `run` under a signal that aborts after `timeoutMs`, or as soon as the
 * caller's `signal` does.
 *
 * Hand-rolled because `AbortSignal.timeout` needs iOS 16 and `AbortSignal.any`
 * 17.4, both above the WebView floor this app supports — on those the native
 * calls throw, and a caller that swallows it loses the work entirely. Owning
 * the timer also lets us clear it once the work settles, rather than leaving
 * one pending per segment across a whole chapter.
 */
export async function withAbortTimeout<T>(
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(signal?.reason)
  if (signal?.aborted) abortFromCaller()
  const timer = setTimeout(
    () => controller.abort(new DOMException('Timed out', 'TimeoutError')),
    timeoutMs,
  )
  signal?.addEventListener('abort', abortFromCaller, { once: true })
  try {
    return await run(controller.signal)
  }
  finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}
