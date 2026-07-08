import { waitForTransactionReceipt } from '@wagmi/core'
import type { Hash } from 'viem'

export function useWaitForTransaction() {
  const { $wagmiConfig } = useNuxtApp()

  // Standard confirmation depth for all contract writes.
  return async function waitForTransaction(hash: Hash) {
    return waitForTransactionReceipt($wagmiConfig, { hash, confirmations: 2 })
  }
}
