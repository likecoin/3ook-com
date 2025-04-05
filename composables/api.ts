export function useLikeCoinChainAPI() {
  const config = useRuntimeConfig()
  const fetch = $fetch.create({ baseURL: config.public.likeCoinChainAPIEndpoint })
  return { fetch }
}

export function useLikeCoinAPI() {
  const config = useRuntimeConfig()
  const fetch = $fetch.create({ baseURL: config.public.likeCoinAPIEndpoint })
  return { fetch }
}
