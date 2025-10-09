import { http, createConfig } from '@wagmi/vue'
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
}) {
  const chain = isTestnet ? baseSepolia : base
  const logoURL = customLogoURL || 'https://3ook.com/pwa-64x64.png'
  return createConfig({
    chains: [chain],
    connectors: [
      injected(),
      metaMask(),
      coinbaseWallet({
        appName: '3ook.com',
        appLogoUrl: logoURL,
      }),
      ...(walletConnectProjectId
        ? [walletConnect({
            projectId: walletConnectProjectId,
            metadata: {
              name: '3ook.com',
              description: '3ook.com is an AI reading companion coupled with a decentralized bookstore on web3',
              url: 'https://3ook.com',
              icons: [logoURL],
            },
          })]
        : []),
      // NOTE: @magiclabs/wagmi-connector is not compatible with SSR
      // https://github.com/magiclabs/wagmi-magic-connector/issues/42#issuecomment-2771613002
      ...(isServer
        ? []
        : [dedicatedWalletConnector({
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
          })]),
    ],
    ssr: true,
    transports: {
      [base.id]: http(),
      [baseSepolia.id]: http(),
    },
  })
}

declare module '@wagmi/vue' {
  interface Register {
    config: ReturnType<typeof createWagmiConfig>
  }
}
