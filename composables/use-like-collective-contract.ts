import { readContract } from '@wagmi/core'
import { useWriteContract } from '@wagmi/vue'

import likeCollectiveABI from '~/contracts/like-collective.json'

export const likeCollectiveAddress = '0x4506ac2dd1e9a470d92a3d1656e1a99c676e1c8e'

export function useLikeCollectiveContract() {
  const { writeContractAsync } = useWriteContract()
  const { $wagmiConfig } = useNuxtApp()
  // TODO: Update address when deployed

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

  async function stakeToNFTClass(nftClassId: string, amount: bigint) {
    await writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'newStakePosition',
      args: [nftClassId, amount],
    })
  }

  async function unstakeFromStakePosition(tokenId: bigint) {
    await writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'removeStakePosition',
      args: [tokenId],
    })
  }

  async function increaseStakePosition(tokenId: bigint, amount: bigint) {
    await writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'increaseStakeToPosition',
      args: [tokenId, amount],
    })
  }

  async function decreaseStakePosition(tokenId: bigint, amount: bigint) {
    await writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'decreaseStakePosition',
      args: [tokenId, amount],
    })
  }

  async function claimWalletRewards(wallet: string) {
    await writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'claimAllRewards',
      args: [wallet],
    })
  }

  async function depositReward(nftClassId: string, amount: bigint) {
    await writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'depositReward',
      args: [nftClassId, amount],
    })
  }

  async function claimRewardsFromStakePosition(tokenId: bigint) {
    await writeContractAsync({
      address: likeCollectiveAddress,
      abi: likeCollectiveABI,
      functionName: 'claimRewards',
      args: [tokenId],
    })
  }

  return {
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
