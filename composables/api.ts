export function useLegacyLikeCoinChainAPI() {
  const config = useRuntimeConfig()
  const fetch = $fetch.create({ baseURL: config.public.likeCoinChainAPIEndpoint })
  return { fetch }
}

export function useLikeCoinEVMChainAPI() {
  const config = useRuntimeConfig()
  const fetch = $fetch.create({ baseURL: config.public.likeCoinEVMChainAPIEndpoint })
  return { fetch }
}

export function useLikeCoinAPI() {
  const config = useRuntimeConfig()
  const fetch = $fetch.create({ baseURL: config.public.likeCoinAPIEndpoint })
  return { fetch }
}
