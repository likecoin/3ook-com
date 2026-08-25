// `accountStore.login()` throws on register failures (e.g. EMAIL_ALREADY_USED),
// and an uncaught throw leaves the triggering button silently dead with no modal.
// Callers gating an action behind login should use this instead of login() bare.
export function useLoginGuard() {
  const { loggedIn: hasLoggedIn } = useUserSession()
  const accountStore = useAccountStore()
  const { handleError } = useErrorHandler()

  // Resolves true only when the user is logged in and the action may proceed.
  async function ensureLoggedIn(): Promise<boolean> {
    if (hasLoggedIn.value) return true
    try {
      await accountStore.login()
    }
    catch (error) {
      await handleError(error)
      return false
    }
    return hasLoggedIn.value
  }

  return { ensureLoggedIn }
}
