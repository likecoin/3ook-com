import { useAccount, useConnect, useDisconnect, useSignMessage } from '@wagmi/vue'
import { UserRejectedRequestError } from 'viem'
import { FetchError } from 'ofetch'

import { LoginModal } from '#components'

export const useAccountStore = defineStore('account', () => {
  const { address } = useAccount()
  const { connectAsync, connectors, status } = useConnect()
  const { disconnectAsync } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const { fetch: refreshSession } = useUserSession()
  const overlay = useOverlay()
  const errorModal = useErrorModal()
  const { t: $t } = useI18n()

  const loginModal = overlay.create(LoginModal)

  const likeWallet = ref<string | null>(null)
  const isLoggingIn = ref(false)
  const isConnectModalOpen = ref(false)

  async function login() {
    try {
      isLoggingIn.value = true

      const connectorId: string = await loginModal.open()
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
        throw new Error('Failed to connect')
      }

      const message = JSON.stringify(
        {
          action: 'authorize',
          evmWallet: address.value,
          ts: Date.now(),
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
      else {
        console.error(error)
      }
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

  return {
    likeWallet,
    isLoggingIn,
    isConnectModalOpen,

    login,
    logout,
  }
})
