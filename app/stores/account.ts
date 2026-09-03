import { useConnection, useChainId, useConnect, useDisconnect, useSignMessage } from '@wagmi/vue'
import { getConnection, ConnectorAlreadyConnectedError, type Connector, type GetConnectionReturnType } from '@wagmi/core'
import { UserRejectedRequestError } from 'viem'
import { FetchError } from 'ofetch'
import { jwtDecode } from 'jwt-decode'
import type { Magic } from 'magic-sdk'
import type { RouteLocationAsRelativeGeneric } from 'vue-router'

import { LazyLoginModal, LazyRegistrationModal } from '#components'

import { TTS_AUDIO_CACHE } from '~~/shared/constants/tts-cache'
import { usePlusCheckoutStore } from '~/stores/plus-checkout'

const REGISTER_TIME_LIMIT_IN_TS = 15 * 60 * 1000 // 15 minutes

const MAGIC_EMAIL_INPUT_ELEMENT_ID = 'MagicFormInput'

export const SESSION_REFRESH_TIMESTAMP_KEY = 'lastSessionRefreshTs'

const JWT_PERMISSIONS = [
  'profile',
  'email',
  'read:nftbook',
  'write:nftbook',
  'read:plus',
  'write:plus',
  'read:preferences',
  'write:preferences',
  'read:profile',
  'write:profile',
]

function verifyTokenPermissions(token: string): boolean {
  try {
    const decoded = jwtDecode<{ permissions?: string[] }>(token)
    if (!decoded.permissions || !Array.isArray(decoded.permissions)) {
      return false
    }

    return JWT_PERMISSIONS.every(permission =>
      decoded.permissions!.includes(permission),
    )
  }
  catch (error) {
    console.error('Failed to decode token for permission verification:', error)
    return false
  }
}

export const useAccountStore = defineStore('account', () => {
  const config = useRuntimeConfig()
  const { $wagmiConfig } = useNuxtApp()
  const { isConnected } = useConnection()
  const currentChainId = useChainId()
  const { connectAsync, connectors } = useConnect()
  const { disconnectAsync } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const { fetch: refreshSession, user } = useUserSession()
  const overlay = useOverlay()
  const { errorModal, handleError } = useErrorHandler()
  const blockingModal = useBlockingModal()
  const { t: $t, locale } = useI18n()
  const { getLikeCoinV3BookMigrationSiteURL } = useLikeCoinV3MigrationSite()
  const userAccountSessionAPI = useUserAccountSessionAPI()
  const { getAnalyticsParameters } = useAnalytics()
  const { detectedCountry } = useDetectedGeolocation()

  const { ensureMagicSession } = useMagicSession()
  const loginModal = overlay.create(LazyLoginModal)
  const registrationFormModal = overlay.create(LazyRegistrationModal)

  const likeWallet = ref<string | null>(null)
  const isLoggingIn = ref(false)
  const isConnectModalOpen = ref(false)
  const isClearingCaches = ref(false)

  const chainId = computed(() => {
    return $wagmiConfig.chains[0].id
  })

  // Pass to signMessage so wagmi re-reads the chain from the connector,
  // avoiding a mismatch when Magic cached chainId 0 during connect.
  function getActiveConnector() {
    return getConnection($wagmiConfig).connector
  }

  // The deferred reconnect() in plugins/wagmi.ts can land inside our await
  // window, so the connector may already be current by the time we connect.
  async function ensureConnection(connector: Connector) {
    const connection = getConnection($wagmiConfig)
    if (connection.isConnected && connection.connector?.uid === connector.uid) return connection
    try {
      await connectAsync({ connector, chainId: chainId.value })
    }
    catch (error) {
      // Match on name too: a duplicate @wagmi/core copy under @wagmi/vue would
      // defeat instanceof and silently restore the crash this guards against.
      const isAlreadyConnected = error instanceof ConnectorAlreadyConnectedError
        || (error as Error)?.name === 'ConnectorAlreadyConnectedError'
      if (!isAlreadyConnected) throw error
    }
    return getConnection($wagmiConfig)
  }

  const isLoginWithMagic = computed(() => {
    return user.value && user.value.loginMethod === 'magic'
  })

  watch(
    () => user.value,
    async (user) => {
      useSetLogUser(user, locale.value)
      // logout() awaits client-only composables (wagmi disconnect, $fetch, useOverlay);
      // running it during SSR drops the Nuxt instance after the first await and 500s.
      if (!import.meta.client) return
      if (user?.token && !verifyTokenPermissions(user.token)) {
        await logout()
      }
    },
    { immediate: true, deep: true },
  )

  watch(
    [isConnected, currentChainId],
    async ([connected, chain]) => {
      if (connected) {
        const hasValidConnection = $wagmiConfig.chains.map(c => c.id).includes(chain)
        if (!hasValidConnection) {
          await disconnectAsync()
        }
      }
    },
    { immediate: true },
  )

  const getEmailAlreadyUsedErrorMessage = ({
    email,
    evmWallet,
    likeWallet,
  }: {
    email: string
    evmWallet?: string
    likeWallet?: string
  }) => {
    if (evmWallet) {
      return $t('account_register_error_email_already_used_with_evm_wallet', { email, evmWallet })
    }
    if (likeWallet) {
      return $t('account_register_error_email_already_used_with_like_wallet', { email, likeWallet })
    }
    return $t('account_register_error_email_already_used', { email })
  }

  // A v1 account holds neither wallet, so the API's isMigratable flag is the only
  // signal it can be auto-linked; fall back to the wallet shape for API versions
  // that predate the flag.
  function resolveIsMigratable(data?: {
    isMigratable?: boolean
    evmWallet?: string
    likeWallet?: string
  } | null): boolean {
    return data?.isMigratable ?? (!data?.evmWallet && !!data?.likeWallet)
  }

  function getEmailAlreadyUsedErrorData({
    email,
    walletAddress,
    boundEVMWallet,
    boundLikeWallet,
    isMigratable,
    loginMethod,
  }: {
    email: string
    walletAddress: string
    boundEVMWallet?: string
    boundLikeWallet?: string
    isMigratable: boolean
    loginMethod: string
  }) {
    const shouldMigrate = isMigratable
    return {
      statusCode: 401,
      // Without a message the thrown error is nameless: it reaches error
      // tracking as an unattributable "Object captured as exception" that
      // fragments per page, and customHandlerMap has nothing to match on.
      message: 'EMAIL_ALREADY_USED',
      data: {
        level: 'warning' as ErrorLevel,
        title: shouldMigrate
          ? $t('account_register_error_email_already_used_migrate_title')
          : $t('account_register_error_email_already_used_by_wallet_title'),
        description: getEmailAlreadyUsedErrorMessage({
          email,
          evmWallet: boundEVMWallet,
          likeWallet: boundLikeWallet,
        }),
        tags: [
          { label: loginMethod, icon: 'i-material-symbols-login-rounded' },
          { label: walletAddress, icon: 'i-material-symbols-key-outline-rounded' },
        ] as ErrorHandlerTag[],
        actions: (shouldMigrate
          ? [{
              label: $t('account_register_error_contact_support'),
              color: 'secondary',
              variant: 'subtle',
              onClick: async () => {
                await navigateTo(getLikeCoinV3BookMigrationSiteURL.value({ utmSource: 'login_email_already_used' }), {
                  external: true,
                  open: { target: '_blank' },
                })
              },
            }]
          : []) as ErrorHandlerAction[],
      },
    }
  }

  async function checkIsRegistered({
    walletAddress,
    email,
    magicDIDToken,
    loginMethod,
  }: {
    walletAddress: string
    email?: string
    magicDIDToken?: string
    loginMethod: string
  }) {
    try {
      const userInfoRes = await fetchLikerPublicInfoByWalletAddress(walletAddress, { nocache: true })
      if (userInfoRes?.user) {
        // If user info is fetched successfully, it means the wallet address is registered
        return true
      }
    }
    catch (error) {
      if (!(error instanceof FetchError && error.statusCode === 404)) {
        console.warn(`Failed to fetch user info for wallet ${walletAddress} in account refresh`, error)
      }
    }
    try {
      await fetchUserRegisterCheck({ walletAddress, email, magicDIDToken })
      // If the request succeeds, it means there is no account associated with the wallet address and email
      return false
    }
    catch (error) {
      if (error instanceof FetchError) {
        switch (error.data?.error) {
          case 'EMAIL_ALREADY_USED': {
            const isMigratable = resolveIsMigratable(error.data)
            if (isMigratable) {
              try {
                const message = JSON.stringify({
                  action: 'migrate',
                  evmWallet: walletAddress,
                  email,
                  magicDIDToken,
                  ts: Date.now(),
                }, null, 2)
                const signature = await signMessageAsync({ message, connector: getActiveConnector() })
                const res = await userAccountSessionAPI.migrateMagicEmailUser({
                  wallet: walletAddress,
                  signature,
                  message,
                })
                if (res.isMigratedLikerId) {
                  useLogEvent('login_v1_auto_migrate_success')
                  return true
                }
              }
              catch (e) {
                useLogEvent('login_v1_auto_migrate_error', {
                  error_code: getErrorCode(e),
                  error_message: getErrorEventMessage(e),
                })
                console.warn('Failed to migrate Magic email user', e)
              }
            }
            throw createError(getEmailAlreadyUsedErrorData({
              email: email as string,
              walletAddress,
              boundEVMWallet: error.data?.evmWallet,
              boundLikeWallet: error.data?.likeWallet,
              isMigratable,
              loginMethod,
            }))
          }

          case 'EVM_WALLET_ALREADY_EXIST':
            // Already registered
            return true

          default:
        }
      }
      throw error
    }
  }

  async function register({
    walletAddress,
    email: prefilledEmail,
    loginMethod,
    magicUserId,
    magicDIDToken,
  }: {
    walletAddress: string
    email?: string
    loginMethod: string
    magicUserId?: string
    magicDIDToken?: string
  }) {
    let tempAccountId = generateAccountIdFromWalletAddress(walletAddress)
    try {
      await fetchUserRegisterCheck({ accountId: tempAccountId })
    }
    catch (error) {
      if (error instanceof FetchError && error.data?.error === 'USER_ALREADY_EXIST') {
        tempAccountId = error.data.alternative as string
      }
      else {
        throw error
      }
    }

    const startTime = Date.now()
    let hasError = false
    let payload = {
      accountId: tempAccountId,
      email: prefilledEmail,
    }
    // Loop until registration is successful, user cancels or timeout
    do {
      // Check if registration time exceeds the limit
      if (Date.now() - startTime > REGISTER_TIME_LIMIT_IN_TS) {
        useLogEvent('register_timeout', { method: loginMethod })
        throw createError({
          statusCode: 408,
          data: { description: $t('account_register_timeout') },
        })
      }
      try {
        // Skip registration modal if email is provided
        if (!payload.email || hasError) {
          useLogEvent('register_form_open', { method: loginMethod })
          payload = await registrationFormModal.open({
            accountId: payload?.accountId,
            isAccountIdHidden: true,
            email: payload?.email || '',
            isDisplayNameHidden: true,
          }).result
        }
        if (!payload) {
          // User canceled the registration
          break
        }
        hasError = false

        // Prepare signature for registration
        const message = JSON.stringify(
          {
            action: 'register',
            evmWallet: walletAddress,
            email: payload.email,
            ts: Date.now(),
          },
          null,
          2,
        )
        const signature = await signMessageAsync({ message, connector: getActiveConnector() })

        await $fetch('/api/register', {
          method: 'POST',
          body: {
            walletAddress,
            signature,
            message,
            email: payload.email,
            accountId: payload.accountId,
            loginMethod,
            magicUserId,
            magicDIDToken,
            locale: locale.value,
            ipCountry: detectedCountry.value || undefined,
            ...getAnalyticsParameters(),
          },
        })

        return true
      }
      catch (error) {
        hasError = true
        if (error instanceof FetchError) {
          switch (error.data?.message) {
            case 'INVALID_USER_ID': {
              useLogEvent('register_invalid_account_id')
              await errorModal.open({ description: $t('account_register_error_invalid_account_id', { id: payload?.accountId }) }).result
              continue
            }
            case 'EMAIL_ALREADY_USED': {
              useLogEvent('register_email_already_used')
              await errorModal.open(getEmailAlreadyUsedErrorData({
                email: payload?.email as string,
                walletAddress,
                boundEVMWallet: error.data?.evmWallet,
                boundLikeWallet: error.data?.likeWallet,
                isMigratable: resolveIsMigratable(error.data),
                loginMethod,
              }).data).result
              continue
            }
            default:
          }
        }
        throw error
      }
    } while (hasError)
    return false
  }

  function assertConnectedWalletMatchesAccount(walletAddress?: string) {
    if (!walletAddress || !user.value?.evmWallet) return
    if (walletAddress.toLowerCase() !== user.value.evmWallet.toLowerCase()) {
      throw createError({
        statusCode: 400,
        message: $t('error_connected_wallet_different'),
      })
    }
  }

  async function restoreConnection() {
    // Read live state: the deferred reconnect() in plugins/wagmi.ts may not have
    // run yet, and returning early on an empty ref skips the mismatch check.
    const connection = getConnection($wagmiConfig)
    if (connection.isConnected && connection.address) {
      assertConnectedWalletMatchesAccount(connection.address)
      return
    }
    const lastUsedConnectorId = user.value?.loginMethod
    let connector
    if (lastUsedConnectorId) {
      // Resolve from the raw wagmi config rather than the reactive
      // `useConnect()` connectors: a Vue proxy passed into wagmi core crashes
      // its cycle-detection-free `deepEqual` with "Maximum call stack size
      // exceeded" (circular connector→config→connectors graph).
      connector = $wagmiConfig.connectors.find(c => c.id === lastUsedConnectorId)
    }
    if (!connector) {
      await login()
      return
    }
    // Magic can only reconnect silently while its client session is alive; if
    // it has expired, connectAsync falls into the connector's OTP form with no
    // email and hangs, so fall back to the explicit login flow instead.
    if (connector.id === 'magic' && !(await isMagicSessionAlive(connector))) {
      await login()
      return
    }
    const restored = await ensureConnection(connector)
    // Callers chain writeContractAsync/signMessageAsync straight onto this, so
    // returning without a live connector hands them a bare wagmi
    // ConnectorNotConnectedError instead of a message they can act on.
    if (!restored.isConnected) {
      throw createError({
        statusCode: 400,
        message: $t('error_connect_wallet_failed'),
      })
    }
    assertConnectedWalletMatchesAccount(restored.address)
  }

  async function login({ connectorId: preferredConnectorId, email: preferredEmail, isRetry = false }: { connectorId?: string, email?: string, isRetry?: boolean } = {}) {
    let connectorId: string | undefined = preferredConnectorId
    try {
      isLoggingIn.value = true

      // Clear any existing connection. Already a no-op when there is none, and
      // a reactive pre-check would read stale across the awaits that follow.
      await disconnectAsync().catch(() => {})
      let magicEmail: string | undefined = preferredEmail
      // Magic needs an email to seed its OTP input; entering connectAsync without
      // one hangs the connector, so treat a magic login lacking an email as
      // unresolved and fall back to the panel to collect it.
      const isMagicWithoutEmail = () => connectorId === 'magic' && !magicEmail
      if (!connectorId || !connectors.some((c: { id: string }) => c.id === connectorId) || isMagicWithoutEmail()) {
        useLogEvent('login_panel_open')
        // Cast because the Lazy* async-component wrapper hides LoginModal's close-payload from useOverlay's inference
        const result = await loginModal.open().result as { id: string, email?: string } | undefined
        connectorId = result?.id
        magicEmail = result?.email
      }
      if (!connectorId || isMagicWithoutEmail()) {
        useLogEvent('login_panel_dismiss')
        return
      }

      // Resolve from the raw wagmi config (see `restoreConnection`) to avoid
      // leaking a reactive proxy into wagmi core.
      const connector = $wagmiConfig.connectors.find(c => c.id === connectorId)
      if (!connector) return

      let magicEmailInput: HTMLInputElement | undefined
      let removeMagicOTPHint: (() => void) | undefined
      if (connectorId === 'magic' && magicEmail) {
        document.getElementById(MAGIC_EMAIL_INPUT_ELEMENT_ID)?.remove()
        magicEmailInput = document.createElement('input')
        magicEmailInput.id = MAGIC_EMAIL_INPUT_ELEMENT_ID
        magicEmailInput.type = 'hidden'
        magicEmailInput.value = magicEmail
        magicEmailInput.style.display = 'none'
        document.body.appendChild(magicEmailInput)
        // Magic owns the OTP entry UI; surface a hint above it asking the user
        // to confirm the address and check spam if the code never arrives.
        removeMagicOTPHint = showMagicOTPHint($t('login_magic_otp_hint', { email: magicEmail }))
      }

      isLoggingIn.value = true
      let connection: GetConnectionReturnType | undefined
      try {
        connection = await ensureConnection(connector)
      }
      finally {
        if (connectorId === 'magic') {
          // Clean up the Magic email input and OTP hint if they exist
          magicEmailInput?.remove()
          removeMagicOTPHint?.()
        }
      }

      blockingModal.open({ title: $t('account_verifying') })

      const walletAddress = connection?.address
      if (!connection?.isConnected || !walletAddress) {
        throw createError({
          statusCode: 400,
          message: $t('error_connect_wallet_failed'),
        })
      }

      useLogEvent('login_wallet_connected', { method: connector.id })

      // Get email from Magic SDK if using Magic Link
      let email: string | undefined
      let magicUserId: string | undefined
      let magicDIDToken: string | undefined
      const loginMethod = connector.id
      const magic = loginMethod === 'magic' ? await resolveMagicFromConnector(connector) : null
      if (magic) {
        try {
          const userInfo = await magic.user.getInfo()
          if (userInfo.email) {
            email = userInfo.email
          }
          if (userInfo.issuer) {
            magicUserId = userInfo.issuer
          }
          magicDIDToken = await magic.user.getIdToken()
        }
        catch (error) {
          console.warn('Failed to fetch user info from Magic SDK', error)
        }
      }

      // Check if the wallet address or email is already registered
      let isRegistered = await checkIsRegistered({ walletAddress, email, magicDIDToken, loginMethod })
      if (!isRegistered) {
        // If not registered, proceed to registration
        isRegistered = await register({ walletAddress, email, loginMethod, magicUserId, magicDIDToken })
        if (!isRegistered) {
          // User canceled the registration
          useLogEvent('login_register_cancelled', { method: connector.id })
          return
        }
        useLogEvent('sign_up', {
          method: connector.id,
          // Dedup key shared with the server CompleteRegistration CAPI event so
          // Meta collapses the browser + server pair into one conversion.
          transaction_id: walletAddress?.toLowerCase(),
        })
      }

      // Prepare message for login
      const message = JSON.stringify(
        {
          action: 'authorize',
          evmWallet: walletAddress,
          ts: Date.now(),
          email,
          loginMethod,
          permissions: JWT_PERMISSIONS,
        },
        null,
        2,
      )

      blockingModal.patch({ title: $t('account_signing_in') })
      const signature = await signMessageAsync({ message, connector: getActiveConnector() })

      blockingModal.patch({ title: $t('account_logging_in') })
      await apiFetch('/login', {
        method: 'POST',
        retry: API_MAX_RETRIES,
        body: {
          walletAddress,
          signature,
          message,
          loginMethod,
          email,
          expiresIn: '30d',
        },
      })

      await refreshSession()

      if (user.value?.likerId) {
        useLogEvent('login', {
          method: connector.id,
        })
      }

      blockingModal.patch({ title: $t('account_logged_in') })
      // Wait for a moment to show the logged in message
      await sleep(1000)
    }
    catch (error) {
      // Disconnect any existing connection if error occurs
      await disconnectAsync().catch(() => {
        // Ignore disconnect errors
      })

      // An expired WalletConnect proposal means the user walked away from the
      // QR modal, so it belongs with the explicit rejections.
      if (error instanceof UserRejectedRequestError
        || getErrorMessage(error).includes(WALLET_CONNECT_PROPOSAL_EXPIRED)) {
        useLogEvent('login_wallet_rejected', { method: connectorId })
        return
      }
      if (getErrorMessage(error).includes('User canceled action.')) {
        return
      }
      if (error instanceof FetchError && error.data?.message === 'EMAIL_ALREADY_USED') {
        useLogEvent('login_email_already_used', { method: connectorId })
        return
      }
      useLogEvent('login_error', {
        method: connectorId,
        error_code: getErrorCode(error),
        error_message: getErrorEventMessage(error),
      })
      await handleError(error)
      // Retry once; the reopened panel is the recovery affordance.
      if (isRetry) return
      return login({ isRetry: true })
    }
    finally {
      isLoggingIn.value = false
      blockingModal.close()
    }
  }

  async function clearCaches() {
    if (!import.meta.client) return
    // The app keeps its own TTS segment cache on disk, invisible to the
    // web-layer purge below; ask the shell to drop that too.
    requestNativeClearCaches()
    if (!window.caches) return
    try {
      isClearingCaches.value = true
      const keys = await window.caches.keys()
      if (!keys?.length) return

      const bookKeys = keys.filter(key => key.startsWith(config.public.cacheKeyPrefix))
      await Promise.all(bookKeys.map(key => caches.delete(key)))

      // Workbox names its cache without the prefix, so the filter misses it.
      await caches.delete(TTS_AUDIO_CACHE)

      if (!window.localStorage) return

      bookKeys.forEach((key) => {
        getReaderCacheKeySuffixes().forEach((suffix) => {
          window.localStorage.removeItem(`${key}-${suffix}`)
        })
      })

      window.localStorage.removeItem(getBookFileCacheIndexKey(config.public.cacheKeyPrefix))
      // The pin index is the audio cache's sidecar, exactly as the line above is
      // the book caches'. Left behind, it lists downloads whose audio just went.
      window.localStorage.removeItem(getTTSPinIndexKey(config.public.cacheKeyPrefix))

      // Must use the same cacheKeyPrefix-scoped key the values are written under
      // (getTTSConfigCacheKey); the unprefixed key would clear nothing.
      const ttsConfigCacheKey = getTTSConfigCacheKey(config.public.cacheKeyPrefix)
      getTTSConfigKeySuffixes().forEach((suffix) => {
        window.localStorage.removeItem(getTTSConfigKeyWithSuffix(ttsConfigCacheKey, suffix))
      })
    }
    finally {
      isClearingCaches.value = false
    }
  }

  async function logout() {
    blockingModal.open({ title: $t('account_logging_out') })
    try {
      await disconnectAsync()
      await apiFetch('/logout', { method: 'POST', retry: API_MAX_RETRIES })
      // The Stripe session and saved redirect belong to the account that left;
      // drop them before the fallible refresh, which would otherwise strand
      // them for the next login.
      usePlusCheckoutStore().clear()
      clearCaches()
      savePlusRedirectRoute(null)
      await refreshSession()
      blockingModal.patch({ title: $t('account_logged_out') })
      // Wait for a moment to show the logged out message
      await sleep(500)
    }
    finally {
      blockingModal.close()
    }
  }

  // Coalesce concurrent callers (mount + page-level callOnce + visibility
  // resume can fire near-simultaneously) so we don't double-rotate the JWT.
  let inFlightRefresh: Promise<void> | null = null
  async function refreshSessionInfo() {
    if (inFlightRefresh) return inFlightRefresh
    inFlightRefresh = (async () => {
      try {
        await apiFetch('/account/refresh', { method: 'POST', retry: API_MAX_RETRIES })
        await refreshSession()
        if (import.meta.client) {
          localStorage.setItem(SESSION_REFRESH_TIMESTAMP_KEY, String(Date.now()))
        }
      }
      finally {
        inFlightRefresh = null
      }
    })()
    return inFlightRefresh
  }

  // Resolves the live Magic SDK instance for the current Magic user, ensuring an
  // active session first. Throws if the user isn't connected through Magic.
  async function getMagicInstance(): Promise<Magic> {
    await ensureMagicSession()
    const connector = connectors.find((c: { id: string }) => c.id === 'magic')
    const magic = await resolveMagicFromConnector(connector)
    if (!magic) {
      throw createError({
        statusCode: 400,
        message: $t('error_connect_wallet_failed'),
        fatal: true,
      })
    }
    return magic
  }

  async function exportPrivateKey() {
    // NOTE: This function is only for login with Magic Link
    if (user.value?.loginMethod !== 'magic') {
      throw createError({
        statusCode: 400,
        message: $t('account_export_private_key_not_supported'),
        fatal: true,
      })
    }

    try {
      const magic = await getMagicInstance()
      await magic.user.revealEVMPrivateKey()
    }
    catch (error) {
      if (error instanceof Error && error.message.includes('User canceled action.')) {
        return
      }
      throw error
    }
  }

  // Changes a Magic user's login email through Magic's OTP-verified flow (showUI),
  // which preserves the wallet/issuer. Returns a fresh DID token for the new email
  // so the backend can keep isEmailVerified=true; returns undefined if the user
  // cancels. Caller is responsible for the our-DB pre-check and persisting via API.
  async function updateMagicEmail(email: string): Promise<string | undefined> {
    if (user.value?.loginMethod !== 'magic') {
      throw createError({
        statusCode: 400,
        message: $t('account_page_email_update_unsupported_login_method'),
        fatal: true,
      })
    }
    try {
      const magic = await getMagicInstance()
      await magic.auth.updateEmailWithUI({ email })
      return await magic.user.getIdToken()
    }
    catch (error) {
      if (error instanceof Error && error.message.includes('User canceled action.')) {
        return undefined
      }
      throw error
    }
  }

  const plusRedirectRoute = useLocalStorage<RouteLocationAsRelativeGeneric | null>('plus_redirect_route', null)

  function savePlusRedirectRoute(route: RouteLocationAsRelativeGeneric | null) {
    plusRedirectRoute.value = route
  }

  return {
    likeWallet,
    isLoggingIn,
    isConnectModalOpen,
    isClearingCaches,
    isLoginWithMagic,

    login,
    logout,
    refreshSessionInfo,
    restoreConnection,
    exportPrivateKey,
    updateMagicEmail,
    clearCaches,
    plusRedirectRoute,
    savePlusRedirectRoute,
  }
})
