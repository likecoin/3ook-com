export const TTS_PREVIEW_NFT_CLASS_ID = 'custom_voice_preview'

export function computeTTSTextSig(token: string, nftClassId: string, text: string): string {
  return cyrb53(`${token}:${nftClassId.toLowerCase()}:${text}`)
}

function cyrb53(str: string): string {
  let h1 = 0x300CDEED
  let h2 = 0xDEF1B00C
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}
