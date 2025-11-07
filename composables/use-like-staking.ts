import { waitForTransactionReceipt } from '@wagmi/core'

export function useLikeStaking() {
  const { $wagmiConfig } = useNuxtApp()
  const { approveIfNeeded: approveIfNeededLikeCoin } = useLikeCoinContract()
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
    const approvalHash = await approveIfNeededLikeCoin(wallet, likeCollectiveAddress, amount)
    if (approvalHash) {
      await waitForTransactionReceipt($wagmiConfig, {
        hash: approvalHash,
        confirmations: 2,
      })
    }
    const tokenIds = await getWalletLikeStakePositionIdsOfNFTClassId(wallet, nftClassId)
    if (tokenIds[0]) {
      const stakeHash = await increaseStakePosition(tokenIds[0], amount)
      await waitForTransactionReceipt($wagmiConfig, {
        hash: stakeHash,
        confirmations: 2,
      })
    }
    else {
      const stakeHash = await rawStakeToNFTClass(nftClassId, amount)
      await waitForTransactionReceipt($wagmiConfig, {
        hash: stakeHash,
        confirmations: 2,
      })
    }
  }

  async function unstakeFromNFTClass(wallet: string, nftClassId: string) {
    const tokenIds = await getWalletLikeStakePositionIdsOfNFTClassId(wallet, nftClassId)
    await Promise.all(tokenIds.map(tokenId => unstakeFromStakePosition(tokenId)))
  }

  async function depositReward(wallet: string, nftClassId: string, amount: bigint) {
    const approvalHash = await approveIfNeededLikeCoin(wallet, likeCollectiveAddress, amount)
    if (approvalHash) {
      await waitForTransactionReceipt($wagmiConfig, {
        hash: approvalHash,
        confirmations: 2,
      })
    }
    const depositHash = await rawDepositReward(nftClassId, amount)
    await waitForTransactionReceipt($wagmiConfig, {
      hash: depositHash,
      confirmations: 2,
    })
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
  }
}
