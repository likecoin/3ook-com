import { getAddress } from 'viem'

export function checkIsEVMAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
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
