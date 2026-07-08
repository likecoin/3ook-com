import { useConnection, useChainId, useConnect, useDisconnect, useSignMessage } from '@wagmi/vue'
import { UserRejectedRequestError } from 'viem'
import { FetchError } from 'ofetch'
import { jwtDecode } from 'jwt-decode'
import type { Magic } from 'magic-sdk'
import type { RouteLocationAsRelativeGeneric } from 'vue-router'

import { LazyLoginModal, LazyRegistrationModal } from '#components'

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
  const { address, isConnected } = useConnection()
  const currentChainId = useChainId()
  const { connectAsync, connectors, status } = useConnect()
  const { disconnectAsync } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const { fetch: refreshSession, user } = useUserSession()
  const overlay = useOverlay()
  const { errorModal, handleError } = useErrorHandler()
  const blockingModal = useBlockingModal()
  const { t: $t, locale } = useI18n()
  const { getLikeCoinV3BookMigrationSiteURL } = useLikeCoinV3MigrationSite()
  const likeCoinSessionAPI = useLikeCoinSessionAPI()
  const { getAnalyticsParameters } = useAnalytics()

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

  function getEmailAlreadyUsedErrorData({
    email,
    walletAddress,
    boundEVMWallet,
    boundLikeWallet,
    loginMethod,
  }: {
    email: string
    walletAddress: string
    boundEVMWallet?: string
    boundLikeWallet?: string
    loginMethod: string
  }) {
    const shouldMigrate = !boundEVMWallet && !!boundLikeWallet
    return {
      statusCode: 401,
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
          case 'EMAIL_ALREADY_USED':
            if (!error.data?.evmWallet && error.data?.likeWallet) {
              try {
                const message = JSON.stringify({
                  action: 'migrate',
                  evmWallet: walletAddress,
                  email,
                  magicDIDToken,
                  ts: Date.now(),
                }, null, 2)
                const signature = await signMessageAsync({ message })
                const res = await likeCoinSessionAPI.migrateMagicEmailUser({
                  wallet: walletAddress,
                  signature,
                  message,
                })
                if (res.isMigratedLikerId) {
                  return true
                }
              }
              catch (e) {
                console.warn('Failed to migrate Magic email user', e)
              }
            }
            throw createError(getEmailAlreadyUsedErrorData({
              email: email as string,
              walletAddress,
              boundEVMWallet: error.data?.evmWallet,
              boundLikeWallet: error.data?.likeWallet,
              loginMethod,
            }))

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
        const signature = await signMessageAsync({ message })

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

  async function restoreConnection() {
    if (address.value) {
      if (user.value?.evmWallet && address.value.toLowerCase() !== user.value.evmWallet.toLowerCase()) {
        throw createError({
          statusCode: 400,
          message: $t('error_connected_wallet_different'),
        })
      }
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
    if (connector) {
      await connectAsync({
        connector,
        chainId: chainId.value,
      })
    }
    else {
      await login()
    }
  }

  async function login({ connectorId: preferredConnectorId, email: preferredEmail }: { connectorId?: string, email?: string } = {}) {
    let connectorId: string | undefined = preferredConnectorId
    try {
      isLoggingIn.value = true

      // Disconnect any existing connection
      if (isConnected.value) {
        await disconnectAsync().catch(() => {})
      }
      let magicEmail: string | undefined = preferredEmail
      if (!connectorId || !connectors.some((c: { id: string }) => c.id === connectorId)) {
        useLogEvent('login_panel_open')
        // Cast because the Lazy* async-component wrapper hides LoginModal's close-payload from useOverlay's inference
        const result = await loginModal.open().result as { id: string, email?: string } | undefined
        connectorId = result?.id
        magicEmail = result?.email
      }
      if (!connectorId) {
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
      try {
        if (status.value !== 'success') {
          await connectAsync({
            connector,
            chainId: chainId.value,
          })
        }
      }
      finally {
        if (connectorId === 'magic') {
          // Clean up the Magic email input and OTP hint if they exist
          magicEmailInput?.remove()
          removeMagicOTPHint?.()
        }
      }

      useLogEvent('login_wallet_connected', { method: connector.id })

      blockingModal.open({ title: $t('account_verifying') })

      const walletAddress = address.value
      if (status.value !== 'success' || !walletAddress) {
        throw createError({
          statusCode: 400,
          message: $t('error_connect_wallet_failed'),
          fatal: true,
        })
      }

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
      const signature = await signMessageAsync({ message })

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

      if (error instanceof UserRejectedRequestError) {
        useLogEvent('login_wallet_rejected', { method: connectorId })
        return
      }
      if (error instanceof Error && error.message.includes('User canceled action.')) {
        return
      }
      if (error instanceof FetchError && error.data?.message === 'EMAIL_ALREADY_USED') {
        useLogEvent('login_email_already_used', { method: connectorId })
        return
      }
      useLogEvent('login_error', { method: connectorId })
      await handleError(error)
      return login()
    }
    finally {
      isLoggingIn.value = false
      blockingModal.close()
    }
  }

  async function clearCaches() {
    if (!import.meta.client || !window.caches) return
    try {
      isClearingCaches.value = true
      const keys = await window.caches.keys()
      if (!keys?.length) return

      const bookKeys = keys.filter(key => key.startsWith(config.public.cacheKeyPrefix))
      await Promise.all(bookKeys.map(key => caches.delete(key)))

      if (!window.localStorage) return

      bookKeys.forEach((key) => {
        getReaderCacheKeySuffixes().forEach((suffix) => {
          window.localStorage.removeItem(`${key}-${suffix}`)
        })
      })

      window.localStorage.removeItem(getBookFileCacheIndexKey(config.public.cacheKeyPrefix))

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
      await refreshSession()
      clearCaches()
      savePlusRedirectRoute(null)
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
