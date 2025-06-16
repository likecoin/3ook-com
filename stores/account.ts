import { useAccount, useConnect, useDisconnect, useSignMessage } from '@wagmi/vue'
import { UserRejectedRequestError } from 'viem'
import { FetchError } from 'ofetch'
import type { Magic } from 'magic-sdk'

import { LoginModal, RegistrationModal } from '#components'

const REGISTER_TIME_LIMIT_IN_TS = 15 * 60 * 1000 // 15 minutes

export const useAccountStore = defineStore('account', () => {
  const { address } = useAccount()
  const { connectAsync, connectors, status } = useConnect()
  const { disconnectAsync } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const { fetch: refreshSession, user } = useUserSession()
  const overlay = useOverlay()
  const { errorModal, handleError } = useErrorHandler()
  const blockingModal = useBlockingModal()
  const { t: $t } = useI18n()

  const loginModal = overlay.create(LoginModal)
  const registrationFormModal = overlay.create(RegistrationModal)

  const likeWallet = ref<string | null>(null)
  const isLoggingIn = ref(false)
  const isConnectModalOpen = ref(false)

  // TODO: Remove this when legacy mode is fully deprecated
  const isEVMModeActive = ref(true)
  const isEVMMode = computed({
    get: () => isEVMModeActive.value,
    set: async (value) => {
      const prevValue = isEVMModeActive.value
      isEVMModeActive.value = value
      if (!user.value) return
      try {
        await updateSettings({ isEVMModeActive: value })
      }
      catch (error) {
        isEVMModeActive.value = prevValue
        handleError(error, {
          description: $t('account_page_update_settings_error'),
        })
      }
    },
  })

  watch(
    () => user.value,
    (user) => {
      useSetLogUser(user)
    },
    { immediate: true, deep: true },
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

  async function checkIsRegistered({
    walletAddress,
    email,
    magicDIDToken,
  }: {
    walletAddress: string
    email?: string
    magicDIDToken?: string
  }) {
    try {
      await fetchUserRegisterCheck({ walletAddress, email, magicDIDToken })
      // If the request succeeds, it means there is no account associated with the wallet address and email
      return false
    }
    catch (error) {
      if (error instanceof FetchError) {
        switch (error.data?.error) {
          case 'EMAIL_ALREADY_USED':
            throw createError({
              statusCode: 401,
              data: {
                description: getEmailAlreadyUsedErrorMessage({
                  email: email as string,
                  evmWallet: error.data?.evmWallet,
                  likeWallet: error.data?.likeWallet,
                }),
              },
            })

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
        throw createError({
          statusCode: 408,
          data: { description: $t('account_register_timeout') },
        })
      }
      try {
        // Skip registration modal if email is provided
        if (!payload.email || hasError) {
          payload = await registrationFormModal.open({
            accountId: payload?.accountId,
            isAccountIdHidden: true,
            email: payload?.email || '',
            isDisplayNameHidden: true,
          })
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
          },
        })

        return true
      }
      catch (error) {
        hasError = true
        if (error instanceof FetchError) {
          switch (error.data?.message) {
            case 'INVALID_USER_ID': {
              await errorModal.open({ description: $t('account_register_error_invalid_account_id', { id: payload?.accountId }) })
              continue
            }
            case 'EMAIL_ALREADY_USED': {
              await errorModal.open({
                description: getEmailAlreadyUsedErrorMessage({
                  email: payload?.email as string,
                  evmWallet: error.data?.evmWallet,
                  likeWallet: error.data?.likeWallet,
                }),
              })
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

  async function login(preferredConnectorId?: string) {
    try {
      isLoggingIn.value = true
      blockingModal.open({ title: $t('account_logging_in') })

      let connectorId: string | undefined = preferredConnectorId
      if (!connectorId || !connectors.some((c: { id: string }) => c.id === connectorId)) {
        connectorId = await loginModal.open()
      }
      if (!connectorId) return

      const connector = connectors.find(
        (c: { id: string }) => c.id === connectorId,
      )
      if (!connector) return

      // Disconnect any existing connection
      await disconnectAsync({ connector })

      isLoggingIn.value = true
      if (status.value !== 'success') {
        await connectAsync({ connector })
      }

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
      if (loginMethod === 'magic' && 'magic' in connector) {
        const magic = connector.magic as Magic
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
      let isRegistered = await checkIsRegistered({ walletAddress, email, magicDIDToken })
      if (!isRegistered) {
        // If not registered, proceed to registration
        isRegistered = await register({ walletAddress, email, loginMethod, magicUserId, magicDIDToken })
        if (!isRegistered) {
          // User canceled the registration
          return
        }
      }

      // Prepare message for login
      const message = JSON.stringify(
        {
          action: 'authorize',
          evmWallet: walletAddress,
          ts: Date.now(),
          email,
          loginMethod,
          permissions: [
            'profile',
            'read:nftbook',
            'write:nftbook',
            'read:nftcollection',
            'write:nftcollection',
            'read:plus',
            'write:plus',
          ],
        },
        null,
        2,
      )

      const signature = await signMessageAsync({ message })

      await $fetch('/api/login', {
        method: 'POST',
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
      if (error instanceof UserRejectedRequestError) {
        return
      }
      if (error instanceof FetchError && error.data?.message === 'LIKECOIN_WALLET_ADDRESS_NOT_FOUND') {
        await errorModal.open({ description: $t('error_likecoin_wallet_address_not_found', { address: address.value }) })
      }
      await handleError(error)
      return login()
    }
    finally {
      isLoggingIn.value = false
      blockingModal.close()
    }
  }

  async function logout() {
    blockingModal.open({ title: $t('account_logging_out') })
    try {
      await disconnectAsync()
      await $fetch('/api/logout', { method: 'POST' })
      await refreshSession()
      blockingModal.patch({ title: $t('account_logged_out') })
      // Wait for a moment to show the logged out message
      await sleep(500)
    }
    finally {
      blockingModal.close()
    }
  }

  async function updateSettings(params: { isEVMModeActive?: boolean } = {}) {
    await $fetch('/api/account/settings', { method: 'POST', body: params })
    await refreshSession()
  }

  async function refreshSessionInfo() {
    await $fetch('/api/account/refresh', { method: 'POST' })
    await refreshSession()
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
      const connector = connectors.find((c: { id: string }) => c.id === 'magic')
      if (!connector || !('magic' in connector)) {
        throw createError({
          statusCode: 400,
          message: $t('error_connect_wallet_failed'),
          fatal: true,
        })
      }

      const magic = connector.magic as Magic
      await magic.user.revealPrivateKey()
    }
    catch (error) {
      if (error instanceof Error && error.message.includes('User canceled action.')) {
        return
      }
      throw error
    }
  }

  return {
    likeWallet,
    isLoggingIn,
    isConnectModalOpen,
    isEVMMode,

    login,
    logout,
    updateSettings,
    refreshSessionInfo,
    exportPrivateKey,
  }
})
