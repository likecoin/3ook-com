import { readContract } from '@wagmi/core'
import { useWriteContract } from '@wagmi/vue'
import type { Hash } from 'viem'

import veLikeRewardABI from '~/contracts/ve-like-reward.json'

export function useVeLikeRewardContract(contractAddress: Ref<string | null> | string) {
  const { writeContractAsync } = useWriteContract()
  const { $wagmiConfig } = useNuxtApp()

  // Read functions
  async function getClaimedReward(account: string) {
    const claimed = await readContract($wagmiConfig, {
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'getClaimedReward',
      args: [account],
    })
    return claimed as bigint
  }

  async function getPendingReward(account: string) {
    const pending = await readContract($wagmiConfig, {
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'getPendingReward',
      args: [account],
    })
    return pending as bigint
  }

  async function getRewardPool() {
    const pool = await readContract($wagmiConfig, {
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'getRewardPool',
    })
    return pool as bigint
  }

  async function getLastRewardTime() {
    const lastTime = await readContract($wagmiConfig, {
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'getLastRewardTime',
    })
    return lastTime as bigint
  }

  async function getConfig() {
    const config = await readContract($wagmiConfig, {
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'getConfig',
    })
    return config as {
      startTime: bigint
      endTime: bigint
      rewardPerSecond: bigint
      totalReward: bigint
    }
  }

  async function getCurrentCondition() {
    const condition = await readContract($wagmiConfig, {
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'getCurrentCondition',
    })
    return condition as {
      startTime: bigint
      endTime: bigint
      rewardAmount: bigint
      rewardIndex: bigint
    }
  }

  async function paused() {
    const isPaused = await readContract($wagmiConfig, {
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'paused',
    })
    return isPaused as boolean
  }

  // Write functions
  async function deposit(account: string, amount: bigint): Promise<Hash> {
    return writeContractAsync({
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'deposit',

      args: [account, amount],
    })
  }

  async function withdraw(account: string): Promise<Hash> {
    return writeContractAsync({
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'withdraw',
      args: [account],
    })
  }

  async function claimReward(account: string, restake: boolean): Promise<Hash> {
    return writeContractAsync({
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'claimReward',
      args: [account, restake],
    })
  }

  async function addReward(rewardAmount: bigint, startTime: bigint, endTime: bigint): Promise<Hash> {
    return writeContractAsync({
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'addReward',
      args: [rewardAmount, startTime, endTime],
    })
  }

  async function setLikecoin(likecoinAddress: string): Promise<Hash> {
    return writeContractAsync({
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'setLikecoin',
      args: [likecoinAddress],
    })
  }

  async function setVault(vaultAddress: string): Promise<Hash> {
    return writeContractAsync({
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'setVault',
      args: [vaultAddress],
    })
  }

  async function pause(): Promise<Hash> {
    return writeContractAsync({
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'pause',
    })
  }

  async function unpause(): Promise<Hash> {
    return writeContractAsync({
      address: toValue(contractAddress) as `0x${string}`,
      abi: veLikeRewardABI,
      functionName: 'unpause',
    })
  }

  return {
    // Read functions
    getClaimedReward,
    getPendingReward,
    getRewardPool,
    getLastRewardTime,
    getConfig,
    getCurrentCondition,
    paused,
    // Write functions
    deposit,
    withdraw,
    claimReward,
    addReward,
    setLikecoin,
    setVault,
    pause,
    unpause,
  }
}
