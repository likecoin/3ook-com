import { http, createConfig } from '@wagmi/vue'
import { optimism, optimismSepolia } from '@wagmi/vue/chains'
import { injected, metaMask } from '@wagmi/vue/connectors'
import { dedicatedWalletConnector } from '@magiclabs/wagmi-connector'

export function createWagmiConfig({
  apiKey,
  rpcURL = '',
  chainId,
  customLogoURL,
}: {
  apiKey: string
  rpcURL?: string
  chainId?: number
  customLogoURL?: string
}) {
  return createConfig({
    chains: [optimismSepolia, optimism],
    connectors: [
      injected(),
      metaMask(),
      dedicatedWalletConnector({
        chains: [optimismSepolia, optimism],
        options: {
          apiKey,
          accentColor: '#28646E',
          customHeaderText: 'Liker Land',
          customLogo: customLogoURL,
          isDarkMode: false,
          magicSdkConfiguration: {
            network: {
              rpcUrl: rpcURL,
              chainId,
            },
          },
        },
      }),
    ],
    ssr: true,
    transports: {
      [optimism.id]: http(),
      [optimismSepolia.id]: http(),
    },
  })
}

declare module '@wagmi/vue' {
  interface Register {
    config: ReturnType<typeof createWagmiConfig>
  }
}
