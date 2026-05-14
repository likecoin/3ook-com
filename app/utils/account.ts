import { keccak256, toBytes } from 'viem'

const ACCOUNT_ID_CHARS = 'abcdefghjkmnpqrstuvwxyz' as const
const ACCOUNT_ID_LENGTH = 6

function convertBigIntToBaseString(num: bigint, length: number) {
  let str = ''
  for (let i = 0; i < length; i++) {
    const base = BigInt(ACCOUNT_ID_CHARS.length)
    str = ACCOUNT_ID_CHARS[Number(num % base)] + str
    num = num / base
  }
  return str
}

export function generateAccountIdFromWalletAddress(walletAddress: string) {
  const hash = keccak256(toBytes(walletAddress.trim().toLowerCase()))
  // Add 2 to include '0x' prefix
  const hex = hash.slice(0, ACCOUNT_ID_LENGTH * 2 + 2)
  const num = BigInt(hex)
  return convertBigIntToBaseString(num, ACCOUNT_ID_LENGTH)
}

export function verifyAccountId(id: string) {
  return !!id && (/^[a-z0-9-_]+$/.test(id) && id.length >= 5 && id.length <= 20)
}

export function verifyEmail(email: string) {
  return !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
