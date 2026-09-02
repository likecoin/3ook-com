import type { PublisherSubdomainHost } from '~~/shared/constants/publisher-subdomain'
import { getPublisherSubdomainHost } from '~~/shared/constants/publisher-subdomain'

// The host is fixed for the life of the request, so these read it once instead
// of tracking the route.
export function usePublisherSubdomainHost(): PublisherSubdomainHost {
  const { public: { baseURL } } = useRuntimeConfig()
  if (!baseURL) return { type: 'none' }

  return getPublisherSubdomainHost(useRequestURL({ xForwardedHost: true }).host, baseURL)
}

export function usePublisherSubdomainLikerId() {
  const host = usePublisherSubdomainHost()
  return host.type === 'publisher' ? host.likerId : ''
}
