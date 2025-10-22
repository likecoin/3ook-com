import { useWriteContract } from '@wagmi/vue'
import likeCoinErc20Abi from '~/contracts/likecoin.json'

export const likeCoinErc20Address = '0x1EE5DD1794C28F559f94d2cc642BaE62dC3be5cf'

export function useLikeStaking() {
  const { writeContractAsync } = useWriteContract()
  const {
    getLikeStakePositionInfo,
    getWalletLikeStakePositionIdsOfNFTClassId,
    getWalletLikeStakePositionIds,
  } = useLikeStakePositionContract()
  const {
    getWalletPendingRewardsOfNFTClass,
    getWalletStakeOfNFTClass,
    getTotalStakeOfNFTClass,
    stakeToNFTClass: rawStakeToNFTClass,
    unstakeFromStakePosition,
    increaseStakePosition,
    decreaseStakePosition,
    claimRewardsFromStakePosition,
    claimWalletRewards,
    depositReward: rawDepositReward,
  } = useLikeCollectiveContract()

  async function getAllLikeStakePositionInfosOfOwner(owner: string) {
    const tokenIds = await getWalletLikeStakePositionIds(owner)
    const positionInfos = await Promise.all(
      tokenIds.map(tokenId => getLikeStakePositionInfo(Number(tokenId))),
    )
    return positionInfos
  }

  async function getAllLikeStakePositionInfosOfNFTClassByOwner(owner: string, nftClassId: string) {
    const tokenIds = await getWalletLikeStakePositionIdsOfNFTClassId(owner, nftClassId)
    const positionInfos = await Promise.all(
      tokenIds.map(tokenId => getLikeStakePositionInfo(Number(tokenId))),
    )
    return positionInfos
  }

  async function claimWalletRewardsOfNFTClass(wallet: string, nftClassId: string) {
    const tokenIds = await getWalletLikeStakePositionIdsOfNFTClassId(wallet, nftClassId)
    await Promise.all(tokenIds.map(tokenId => claimRewardsFromStakePosition(tokenId)))
  }

  async function stakeToNFTClass(wallet: string, nftClassId: string, amount: bigint) {
    await writeContractAsync({
      address: likeCoinErc20Address,
      abi: likeCoinErc20Abi,
      functionName: 'approve',
      args: [likeCollectiveAddress, amount],
    })
    const tokenIds = await getWalletLikeStakePositionIdsOfNFTClassId(wallet, nftClassId)
    if (tokenIds[0]) {
      await increaseStakePosition(tokenIds[0], amount)
    }
    else {
      await rawStakeToNFTClass(nftClassId, amount)
    }
  }

  async function unstakeFromNFTClass(wallet: string, nftClassId: string) {
    const tokenIds = await getWalletLikeStakePositionIdsOfNFTClassId(wallet, nftClassId)
    await Promise.all(tokenIds.map(tokenId => unstakeFromStakePosition(tokenId)))
  }

  async function depositReward(nftClassId: string, amount: bigint) {
    await writeContractAsync({
      address: likeCoinErc20Address,
      abi: likeCoinErc20Abi,
      functionName: 'approve',
      args: [likeCollectiveAddress, amount],
    })
    await rawDepositReward(nftClassId, amount)
  }

  async function mergeWalletStakePositionsOfNFTClass(wallet: string, nftClassId: string) {
    const positionInfos = await getAllLikeStakePositionInfosOfNFTClassByOwner(wallet, nftClassId)
    const totalStakedAmount = positionInfos.reduce((acc, info) => acc + info.stakedAmount, BigInt(0))
    await unstakeFromNFTClass(wallet, nftClassId)
    await stakeToNFTClass(wallet, nftClassId, totalStakedAmount)
  }

  async function unstakeAmountFromNFTClass(wallet: string, nftClassId: string, amount: bigint) {
    const tokenIds = await getWalletLikeStakePositionIdsOfNFTClassId(wallet, nftClassId)
    if (tokenIds.length === 0) return

    let remainingAmount = amount
    const positionInfos = await Promise.all(
      tokenIds.map(tokenId => getLikeStakePositionInfo(Number(tokenId))),
    )

    for (let i = 0; i < positionInfos.length && remainingAmount > 0n; i++) {
      const positionInfo = positionInfos[i]
      const tokenId = tokenIds[i]

      if (!positionInfo || !tokenId) continue

      if (positionInfo.stakedAmount <= remainingAmount) {
        // Remove entire position
        await unstakeFromStakePosition(tokenId)
        remainingAmount -= positionInfo.stakedAmount
      }
      else {
        // Decrease position partially
        await decreaseStakePosition(tokenId, remainingAmount)
        remainingAmount = 0n
      }
    }
  }

  return {
    stakeToNFTClass,
    unstakeFromNFTClass,
    unstakeAmountFromNFTClass,
    increaseStakePosition,
    decreaseStakePosition,
    claimWalletRewardsOfNFTClass,
    claimWalletRewards,
    getAllLikeStakePositionInfosOfOwner,
    getAllLikeStakePositionInfosOfNFTClassByOwner,
    mergeWalletStakePositionsOfNFTClass,
    getWalletPendingRewardsOfNFTClass,
    getWalletStakeOfNFTClass,
    getTotalStakeOfNFTClass,
    depositReward,
    likeCoinErc20Address,
  }
}
