import type { Magic } from 'magic-sdk'

// The Magic wagmi connector exposes getMagic() without typing it; centralize
// the cast so call sites don't repeat the unsafe assertion.
export async function resolveMagicFromConnector(connector: unknown): Promise<Magic | null> {
  if (!connector || typeof connector !== 'object' || typeof (connector as { getMagic?: unknown }).getMagic !== 'function') {
    return null
  }
  return (connector as { getMagic: () => Promise<Magic> }).getMagic()
}

// Whether the connector's Magic client session is still valid. A missing SDK or
// any probe error counts as expired so callers re-authenticate rather than hang.
export async function isMagicSessionAlive(connector: unknown): Promise<boolean> {
  try {
    const magic = await resolveMagicFromConnector(connector)
    return !!magic && await magic.user.isLoggedIn()
  }
  catch {
    return false
  }
}
