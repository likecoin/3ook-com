import type { Magic } from 'magic-sdk'

// The Magic wagmi connector exposes getMagic() without typing it; centralize
// the cast so call sites don't repeat the unsafe assertion.
export async function resolveMagicFromConnector(connector: unknown): Promise<Magic | null> {
  if (!connector || typeof connector !== 'object' || typeof (connector as { getMagic?: unknown }).getMagic !== 'function') {
    return null
  }
  return (connector as { getMagic: () => Promise<Magic> }).getMagic()
}
