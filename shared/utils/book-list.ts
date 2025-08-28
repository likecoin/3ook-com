import { checksumAddress } from 'viem'

export function getBookListItemId(nftClassId: string, priceIndex: number): string {
  return `${checksumAddress(nftClassId as `0x${string}`)}-${priceIndex}`
}
