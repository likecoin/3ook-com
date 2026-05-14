import { readContract } from '@wagmi/core'

import likeStakePositionABI from '~/contracts/like-stake-position.json'

export type Position = {
  bookNFT: string
  stakedAmount: bigint
  rewardIndex: bigint
  initialStaker: string
}

export function useLikeStakePositionContract() {
  const { $wagmiConfig } = useNuxtApp()
  // TODO: Update address when deployed
  const likeStakePositionAddress = '0x508610D3009cda82Ac1a40D2b322Ed31932D16b1'

  async function getLikeStakePositionInfo(tokenId: number): Promise<Position> {
    const positionInfo = await readContract($wagmiConfig, {
      address: likeStakePositionAddress,
      abi: likeStakePositionABI,
      functionName: 'getPosition',
      args: [tokenId],
    })
    return positionInfo as Position
  }

  async function getLikeStakePositionIdsOfNFTClassId(nftClassId: string): Promise<bigint[]> {
    const tokenIds = await readContract($wagmiConfig, {
      address: likeStakePositionAddress,
      abi: likeStakePositionABI,
      functionName: 'getUserPositionByBookNFT',
      args: [nftClassId],
    })
    return tokenIds as bigint[]
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
    getLikeStakePositionIdsOfNFTClassId,
    getWalletLikeStakePositionIdsOfNFTClassId,
    getWalletLikeStakePositionIds,
  }
}
