import { readContract } from '@wagmi/core'
import type { Hash } from 'viem'

import likeCollectiveABI from '~/contracts/like-collective.json'

export function useLikeCollectiveContract() {
  const config = useRuntimeConfig()
  const { writeContractAsync } = useContractWrite()
  const { $wagmiConfig } = useNuxtApp()
  const likeCollectiveAddress = config.public.likeCoinCollectiveAddress as `0x${string}`

  async function getWalletPendingRewardsOfNFTClass(wallet: string, nftClassId: string) {
    const rewards = await readContract($wagmiConfig, {
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'getPendingRewardsForUser',
      args: [wallet, nftClassId],
    })
    return rewards as bigint
  }

  async function getWalletStakeOfNFTClass(wallet: string, nftClassId: string) {
    const stake = await readContract($wagmiConfig, {
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'getStakeForUser',
      args: [wallet, nftClassId],
    })
    return stake as bigint
  }

  async function getTotalStakeOfNFTClass(nftClassId: string) {
    const totalStake = await readContract($wagmiConfig, {
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'getTotalStake',
      args: [nftClassId],
    })
    return totalStake as bigint
  }

  async function stakeToNFTClass(nftClassId: string, amount: bigint): Promise<Hash> {
    return writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'newStakePosition',
      args: [nftClassId, amount],
    })
  }

  async function unstakeFromStakePosition(tokenId: bigint): Promise<Hash> {
    return writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'removeStakePosition',
      args: [tokenId],
    })
  }

  async function increaseStakePosition(tokenId: bigint, amount: bigint): Promise<Hash> {
    return writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'increaseStakeToPosition',
      args: [tokenId, amount],
    })
  }

  async function decreaseStakePosition(tokenId: bigint, amount: bigint): Promise<Hash> {
    return writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'decreaseStakePosition',
      args: [tokenId, amount],
    })
  }

  async function claimWalletRewards(wallet: string): Promise<Hash> {
    return writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'claimAllRewards',
      args: [wallet],
    })
  }

  async function depositReward(nftClassId: string, amount: bigint): Promise<Hash> {
    return writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'depositReward',
      args: [nftClassId, amount],
    })
  }

  async function claimRewardsFromStakePosition(tokenId: bigint): Promise<Hash> {
    return writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'claimRewards',
      args: [tokenId],
    })
  }

  return {
    likeCollectiveAddress,
    getWalletPendingRewardsOfNFTClass,
    getWalletStakeOfNFTClass,
    getTotalStakeOfNFTClass,
    stakeToNFTClass,
    unstakeFromStakePosition,
    increaseStakePosition,
    decreaseStakePosition,
    depositReward,
    claimRewardsFromStakePosition,
    claimWalletRewards,
  }
}
