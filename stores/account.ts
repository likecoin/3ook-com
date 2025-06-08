import { useAccount, useConnect, useDisconnect, useSignMessage } from '@wagmi/vue'
import { UserRejectedRequestError } from 'viem'
import { FetchError } from 'ofetch'
import type { Magic } from 'magic-sdk'

import { LoginModal } from '#components'

export const useAccountStore = defineStore('account', () => {
  const { address } = useAccount()
  const { connectAsync, connectors, status } = useConnect()
  const { disconnectAsync } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const { fetch: refreshSession, user } = useUserSession()
  const overlay = useOverlay()
  const { errorModal, handleError } = useErrorHandler()
  const { t: $t } = useI18n()
  const { instance: crisp } = useScriptCrisp()

  const loginModal = overlay.create(LoginModal)

  const likeWallet = ref<string | null>(null)
  const isLoggingIn = ref(false)
  const isConnectModalOpen = ref(false)

  const isEVMModeActive = ref<boolean>(user.value?.isEVMModeActive ?? false)
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
      isEVMModeActive.value = user?.isEVMModeActive ?? false
      if (crisp && user) {
        if (user.email) crisp.set('user:email', user.email)
        if (user.evmWallet) crisp.set('session:data', ['evm_wallet', `op:${user.evmWallet}`])
        if (user.likeWallet) crisp.set('session:data', ['like_wallet', user.likeWallet])
        if (user.loginMethod) crisp.set('session:data', ['login_method', user.loginMethod])
        if (user.displayName) {
          crisp.set('user:nickname', user.displayName)
        }
        else if (user.evmWallet || user.likeWallet) {
          crisp.set('user:nickname', user.evmWallet || user.likeWallet)
        }
        if (user.avatar) crisp.set('user:avatar', user.avatar)
      }
    },
    { immediate: true, deep: true },
  )

  async function login(preferredConnectorId?: string) {
    try {
      isLoggingIn.value = true

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
      if (status.value !== 'success') {
        throw createError({
          statusCode: 400,
          message: $t('error_connect_wallet_failed'),
          fatal: true,
        })
      }

      let email: string | undefined
      if (connector.id === 'magic' && 'magic' in connector) {
        const magic = connector.magic as Magic
        try {
          const userInfo = await magic.user.getInfo()
          if (userInfo.email) {
            email = userInfo.email
          }
        }
        catch (error) {
          console.warn('Failed to fetch user info from Magic SDK', error)
        }
      }

      const message = JSON.stringify(
        {
          action: 'authorize',
          evmWallet: address.value,
          ts: Date.now(),
          email,
          loginMethod: connector.id,
          permissions: [
            'profile',
            'read:nftbook',
            'write:nftbook',
            'read:nftcollection',
            'write:nftcollection',
          ],
        },
        null,
        2,
      )

      const signature = await signMessageAsync({ message })

      await $fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          walletAddress: address.value,
          signature,
          message,
          loginMethod: connector.id,
          email,
          expiresIn: '30d',
        },
      })

      await refreshSession()
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
    }
  }

  async function logout() {
    await disconnectAsync()
    await $fetch('/api/logout', { method: 'POST' })
    await refreshSession()
  }

  async function updateSettings(params: { isEVMModeActive?: boolean } = {}) {
    await $fetch('/api/account/settings', { method: 'POST', body: params })
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
    exportPrivateKey,
  }
})
