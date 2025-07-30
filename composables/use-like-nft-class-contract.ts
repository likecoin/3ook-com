import { readContract } from '@wagmi/core'

import likeCoinNFTClassABI from '~/contracts/like-nft-class.json'

export function useLikeNFTClassContract() {
  const { $wagmiConfig } = useNuxtApp()

  async function fetchNFTClassMetadataById(nftClassId: string) {
    const nftClassMetadataURI = await readContract($wagmiConfig, {
      abi: likeCoinNFTClassABI,
      address: nftClassId as `0x${string}`,
      functionName: 'contractURI',
    }) as string
    return parseURIString<NFTClassMetadata>(nftClassMetadataURI)
  }

  async function fetchNFTMetadataByNFTClassIdAndNFTId(nftClassId?: string, nftId?: string) {
    const nftMetadataURI = await readContract($wagmiConfig, {
      abi: likeCoinNFTClassABI,
      address: nftClassId as `0x${string}`,
      functionName: 'tokenURI',
      args: [nftId],
    }) as string
    return parseURIString<NFT>(nftMetadataURI)
  }

  async function fetchNFTBalanceOf(nftClassId: string, nftOwnerWalletAddress: string) {
    const balance = await readContract($wagmiConfig, {
      abi: likeCoinNFTClassABI,
      address: nftClassId as `0x${string}`,
      functionName: 'balanceOf',
      args: [nftOwnerWalletAddress],
    })
    return Number(balance)
  }

  async function fetchNFTIdByNFTClassIdAndWalletAddressAndIndex(nftClassId?: string, nftOwnerWalletAddress?: string, index = 0) {
    const nftId = await readContract($wagmiConfig, {
      abi: likeCoinNFTClassABI,
      address: nftClassId as `0x${string}`,
      functionName: 'tokenOfOwnerByIndex',
      args: [nftOwnerWalletAddress, index],
    })
    return nftId?.toString()
  }

  return {
    fetchNFTClassMetadataById,
    fetchNFTMetadataByNFTClassIdAndNFTId,
    fetchNFTBalanceOf,
    fetchNFTIdByNFTClassIdAndWalletAddressAndIndex,
  }
}
