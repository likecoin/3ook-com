export function checkIsEVMAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export function normalizeNFTClassId(id?: string) {
  return id?.toLowerCase() ?? ''
}
