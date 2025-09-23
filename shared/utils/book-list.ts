export function getBookListItemId(nftClassId: string, priceIndex: number): string {
  return `${nftClassId.toLowerCase()}-${priceIndex || 0}`
}
