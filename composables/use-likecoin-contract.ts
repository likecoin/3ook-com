import { readContract } from '@wagmi/core'
import { useWriteContract } from '@wagmi/vue'
import type { Hash } from 'viem'

import likeCoinABI from '~/contracts/likecoin.json'

export function useLikeCoinContract() {
  const config = useRuntimeConfig()
  const likeCoinAddress = config.public.likeCoinTokenAddress as `0x${string}`
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
  async function approve(spender: string, amount: bigint): Promise<Hash> {
    const hash = await writeContractAsync({
      address: likeCoinAddress,
      abi: likeCoinABI,
      functionName: 'approve',
      args: [spender, amount],
    })
    return hash
  }

  async function approveIfNeeded(owner: string, spender: string, amount: bigint): Promise<Hash | null> {
    const currentAllowance = await allowance(owner, spender)

    // If current allowance is already sufficient, skip approval
    if (currentAllowance >= amount) {
      return null
    }

    // Approve to max uint256 to avoid multiple approvals in the future
    const maxUint256 = (2n ** 256n) - 1n
    const hash = await approve(spender, maxUint256)
    return hash
  }

  async function transfer(to: string, amount: bigint): Promise<Hash> {
    return writeContractAsync({
      address: likeCoinAddress,
      abi: likeCoinABI,
      functionName: 'transfer',
      args: [to, amount],
    })
  }

  async function transferFrom(from: string, to: string, amount: bigint): Promise<Hash> {
    return writeContractAsync({
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
    approveIfNeeded,
    transfer,
    transferFrom,
  }
}
