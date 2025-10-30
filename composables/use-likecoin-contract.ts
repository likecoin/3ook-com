import { readContract } from '@wagmi/core'
import { useWriteContract } from '@wagmi/vue'

import likeCoinABI from '~/contracts/likecoin.json'

export const likeCoinAddress = '0x1EE5DD1794C28F559f94d2cc642BaE62dC3be5cf'
export const LIKE_TOKEN_DECIMALS = 6

export function useLikeCoinContract() {
  const { writeContractAsync } = useWriteContract()
  const { $wagmiConfig } = useNuxtApp()

  // Read functions
  async function balanceOf(account: string) {
    const balance = await readContract($wagmiConfig, {
      address: likeCoinAddress,
      abi: likeCoinABI,
      functionName: 'balanceOf',
      args: [account],
    })
    return balance as bigint
  }

  async function totalSupply() {
    const supply = await readContract($wagmiConfig, {
      address: likeCoinAddress,
      abi: likeCoinABI,
      functionName: 'totalSupply',
    })
    return supply as bigint
  }

  async function allowance(owner: string, spender: string) {
    const amount = await readContract($wagmiConfig, {
      address: likeCoinAddress,
      abi: likeCoinABI,
      functionName: 'allowance',
      args: [owner, spender],
    })
    return amount as bigint
  }

  async function decimals() {
    const dec = await readContract($wagmiConfig, {
      address: likeCoinAddress,
      abi: likeCoinABI,
      functionName: 'decimals',
    })
    return dec as number
  }

  async function name() {
    const nameStr = await readContract($wagmiConfig, {
      address: likeCoinAddress,
      abi: likeCoinABI,
      functionName: 'name',
    })
    return nameStr as string
  }

  async function symbol() {
    const sym = await readContract($wagmiConfig, {
      address: likeCoinAddress,
      abi: likeCoinABI,
      functionName: 'symbol',
    })
    return sym as string
  }

  // Write functions
  async function approve(spender: string, amount: bigint) {
    await writeContractAsync({
      address: likeCoinAddress,
      abi: likeCoinABI,
      functionName: 'approve',
      args: [spender, amount],
    })
  }

  async function transfer(to: string, amount: bigint) {
    await writeContractAsync({
      address: likeCoinAddress,
      abi: likeCoinABI,
      functionName: 'transfer',
      args: [to, amount],
    })
  }

  async function transferFrom(from: string, to: string, amount: bigint) {
    await writeContractAsync({
      address: likeCoinAddress,
      abi: likeCoinABI,
      functionName: 'transferFrom',
      args: [from, to, amount],
    })
  }

  return {
    // Read functions
    balanceOf,
    totalSupply,
    allowance,
    decimals,
    name,
    symbol,
    // Write functions
    approve,
    transfer,
    transferFrom,
  }
}
