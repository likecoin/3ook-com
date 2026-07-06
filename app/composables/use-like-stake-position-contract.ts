import { readContract } from '@wagmi/core'

import likeStakePositionABI from '~/contracts/like-stake-position.json'

export type Position = {
  bookNFT: string
  stakedAmount: bigint
  rewardIndex: bigint
  initialStaker: string
}

export function useLikeStakePositionContract() {
  const config = useRuntimeConfig()
  const { $wagmiConfig } = useNuxtApp()
  const likeStakePositionAddress = config.public.likeCoinStakePositionAddress as `0x${string}`

  async function getLikeStakePositionInfo(tokenId: number): Promise<Position> {
    const positionInfo = await readContract($wagmiConfig, {
      address: likeStakePositionAddress,
      abi: likeStakePositionABI,
      functionName: 'getPosition',
      args: [tokenId],
    })
    return positionInfo as Position
  }

  async function getWalletLikeStakePositionIdsOfNFTClassId(wallet: string, nftClassId: string): Promise<bigint[]> {
    const tokenIds = await readContract($wagmiConfig, {
      address: likeStakePositionAddress,
      abi: likeStakePositionABI,
      functionName: 'getUserPositionByBookNFT',
      args: [wallet, nftClassId],
    })
    return tokenIds as bigint[]
  }

  async function getWalletLikeStakePositionIds(owner: string): Promise<bigint[]> {
    const tokenIds = await readContract($wagmiConfig, {
      address: likeStakePositionAddress,
      abi: likeStakePositionABI,
      functionName: 'getUserPositions',
      args: [owner],
    })
    return tokenIds as bigint[]
  }

  return {
    getLikeStakePositionInfo,
    getWalletLikeStakePositionIdsOfNFTClassId,
    getWalletLikeStakePositionIds,
  }
}
