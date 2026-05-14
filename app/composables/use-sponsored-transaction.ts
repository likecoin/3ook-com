import { encodeFunctionData, createWalletClient, custom, type Abi, type Address, type Hash } from 'viem'
import type { Magic } from 'magic-sdk'

export interface SponsoredWriteContractParams {
  address: Address
  abi: Abi | readonly unknown[]
  functionName: string
  args?: readonly unknown[]
}

/* eslint-disable @typescript-eslint/no-explicit-any -- Cross-SDK boundary: Magic and Alchemy have incompatible type systems */
let alchemyModules: Awaited<ReturnType<typeof loadAlchemyModules>> | null = null
let cachedSmartWalletClient: any | null = null
let cachedMagicInstance: Magic | null = null
let pendingClientCreation: Promise<any> | null = null

async function loadAlchemyModules() {
  const [aaSdk, infra, walletClient] = await Promise.all([
    import('@aa-sdk/core'),
    import('@account-kit/infra'),
    import('@account-kit/wallet-client'),
  ])
  return {
    WalletClientSigner: aaSdk.WalletClientSigner,
    alchemy: infra.alchemy,
    base: infra.base,
    baseSepolia: infra.baseSepolia,
    createSmartWalletClient: walletClient.createSmartWalletClient,
  }
}

function clearSponsoredClientCache() {
  cachedSmartWalletClient = null
  cachedMagicInstance = null
  pendingClientCreation = null
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function useSponsoredTransaction() {
  const accountStore = useAccountStore()
  const config = useRuntimeConfig()
  const { $wagmiConfig } = useNuxtApp()
  const alchemyAPIKey = computed(() => (config.public.customRpcUrl as string)?.split('/v2/')[1])
  const isSponsoredMode = computed(() =>
    !!accountStore.isLoginWithMagic
    && !!alchemyAPIKey.value
    && !!config.public.alchemyGasPolicyId,
  )

  async function getMagicInstance(): Promise<Magic> {
    const currentKey = $wagmiConfig.state.current
    if (!currentKey) {
      throw new Error('No active wallet connection')
    }
    const connector = $wagmiConfig.state.connections.get(currentKey)?.connector
    if (!connector || !('getMagic' in connector)) {
      throw new Error('Magic connector not available')
    }
    return (connector as unknown as { getMagic: () => Promise<Magic> }).getMagic()
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  async function createSmartWalletClient() {
    const magic = await getMagicInstance()

    if (!alchemyModules) {
      alchemyModules = await loadAlchemyModules()
    }
    const { WalletClientSigner, alchemy, base, baseSepolia, createSmartWalletClient: create } = alchemyModules

    const alchemyChain = config.public.isTestnet ? baseSepolia : base
    const apiKey = alchemyAPIKey.value!

    const walletClient = createWalletClient({
      chain: alchemyChain,
      transport: custom(magic.rpcProvider as any),
    })

    const baseSigner = new WalletClientSigner(walletClient, 'magic')
    const signer = {
      ...baseSigner,
      signAuthorization: async (unsignedAuth: any): Promise<any> => {
        const signature = await (magic.wallet as any).sign7702Authorization({
          ...unsignedAuth,
          contractAddress: unsignedAuth.address ?? unsignedAuth.contractAddress,
        })
        return { ...unsignedAuth, ...signature }
      },
    }

    const policyId = config.public.alchemyGasPolicyId as string
    cachedSmartWalletClient = create({
      chain: alchemyChain,
      transport: alchemy({ apiKey }),
      signer: signer as any,
      ...(policyId ? { policyId } : {}),
    })
    cachedMagicInstance = magic

    return cachedSmartWalletClient
  }

  async function getOrCreateSmartWalletClient() {
    const magic = await getMagicInstance()

    if (cachedSmartWalletClient && cachedMagicInstance === magic) {
      return cachedSmartWalletClient
    }

    if (pendingClientCreation) {
      return pendingClientCreation
    }

    pendingClientCreation = createSmartWalletClient().finally(() => {
      pendingClientCreation = null
    })
    return pendingClientCreation
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  async function sponsoredWriteContract(params: SponsoredWriteContractParams): Promise<Hash> {
    const currentKey = $wagmiConfig.state.current
    const userAddress = currentKey
      ? $wagmiConfig.state.connections.get(currentKey)?.accounts[0]
      : undefined
    if (!userAddress) {
      throw new Error('No connected account')
    }

    let txHash: Hash | undefined
    try {
      const client = await getOrCreateSmartWalletClient()

      const callData = encodeFunctionData({
        abi: params.abi as Abi,
        functionName: params.functionName,
        args: params.args || [],
      })

      const result = await client.sendCalls({
        from: userAddress,
        calls: [{
          to: params.address,
          data: callData,
          value: '0x0' as `0x${string}`,
        }],
        capabilities: {
          eip7702Auth: true,
        },
      })

      const status = await client.waitForCallsStatus({ id: result.id })
      txHash = status.receipts?.[0]?.transactionHash as Hash | undefined
    }
    catch (error) {
      clearSponsoredClientCache()
      throw error
    }

    if (!txHash) {
      throw new Error('Sponsored transaction failed: no receipt returned')
    }
    return txHash
  }

  watch(isSponsoredMode, (newVal) => {
    if (!newVal) {
      clearSponsoredClientCache()
    }
  })

  return {
    isSponsoredMode,
    sponsoredWriteContract,
  }
}
