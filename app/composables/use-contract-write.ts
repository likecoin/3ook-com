import { useWriteContract } from '@wagmi/vue'
import type { Hash } from 'viem'

import type { SponsoredWriteContractParams } from './use-sponsored-transaction'

export function useContractWrite() {
  const { writeContractAsync: wagmiWriteContract } = useWriteContract()
  const { isSponsoredMode, sponsoredWriteContract } = useSponsoredTransaction()
  const { ensureMagicSession } = useMagicSession()

  async function writeContractAsync(params: SponsoredWriteContractParams): Promise<Hash> {
    await ensureMagicSession()
    if (isSponsoredMode.value) {
      return sponsoredWriteContract(params)
    }
    return wagmiWriteContract(params as Parameters<typeof wagmiWriteContract>[0])
  }

  return { writeContractAsync }
}
