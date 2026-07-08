let pendingSessionCheck: Promise<void> | null = null

export function useMagicSession() {
  const { $wagmiConfig } = useNuxtApp()

  async function doEnsureMagicSession() {
    const currentKey = $wagmiConfig.state.current
    const connector = currentKey
      ? $wagmiConfig.state.connections.get(currentKey)?.connector
      : undefined
    if (!connector || connector.id !== 'magic') return

    let needsReauth = false
    try {
      const magic = await resolveMagicFromConnector(connector)
      if (!magic) return
      needsReauth = !(await magic.user.isLoggedIn())
    }
    catch {
      needsReauth = true
    }

    if (!needsReauth) return

    const accountStore = useAccountStore()
    const { user } = useUserSession()
    await accountStore.login({
      connectorId: 'magic',
      email: user.value?.email,
    })

    // accountStore.login() silently returns when the user dismisses Magic's UI,
    // so confirm wagmi actually reconnected before letting the caller proceed.
    const newKey = $wagmiConfig.state.current
    if (!newKey || !$wagmiConfig.state.connections.get(newKey)) {
      throw createError({
        statusCode: 401,
        message: 'MAGIC_SESSION_EXPIRED',
      })
    }
  }

  async function ensureMagicSession() {
    if (pendingSessionCheck) {
      return pendingSessionCheck
    }
    pendingSessionCheck = doEnsureMagicSession().finally(() => {
      pendingSessionCheck = null
    })
    return pendingSessionCheck
  }

  return { ensureMagicSession }
}
