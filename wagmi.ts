import { http, createConfig, type CreateConnectorFn, type Config } from '@wagmi/core'
import { base, baseSepolia } from '@wagmi/vue/chains'
import { injected, metaMask, walletConnect, coinbaseWallet } from '@wagmi/vue/connectors'
import { dedicatedWalletConnector } from '@likecoin/wagmi-connector'

export function createWagmiConfig({
  apiKey,
  customLogoURL,
  walletConnectProjectId,
  isServer = false,
  isTestnet = false,
}: {
  apiKey: string
  customLogoURL?: string
  walletConnectProjectId?: string
  isServer?: boolean
  isTestnet?: boolean
}): Config {
  const chain = isTestnet ? baseSepolia : base
  const logoURL = customLogoURL || 'https://3ook.com/pwa-64x64.png'
  const connectors: CreateConnectorFn[] = [
    injected(),
    metaMask(),
    coinbaseWallet({
      appName: '3ook.com',
      appLogoUrl: logoURL,
    }),
  ]
  if (!isServer) {
    if (walletConnectProjectId) {
      connectors.push(
        walletConnect({
          projectId: walletConnectProjectId,
          metadata: {
            name: '3ook.com',
            description: '3ook.com is an AI reading companion coupled with a decentralized bookstore on web3',
            url: 'https://3ook.com',
            icons: [logoURL],
          },
        }))
    }
    connectors.push(dedicatedWalletConnector({
      chains: [chain],
      options: {
        apiKey,
        accentColor: '#131313',
        customHeaderText: '3ook.com',
        customLogo: logoURL,
        isDarkMode: false,
        magicSdkConfiguration: {
          deferPreload: true,
          network: {
            rpcUrl: chain.rpcUrls.default.http[0],
            chainId: chain.id,
          },
        },
      },
    }) as CreateConnectorFn)
  }

  return createConfig({
    chains: [chain],
    connectors,
    ssr: true,
    transports: {
      [base.id]: http(),
      [baseSepolia.id]: http(),
    },
  })
}

declare module '@wagmi/vue' {
  interface Register {
    config: Config
  }
}
