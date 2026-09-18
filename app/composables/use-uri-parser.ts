export function useURIParser() {
  const config = useRuntimeConfig()

  function normalizeURIToHTTP(url?: string) {
    return normalizeContentURIToHTTP(url, {
      arweaveEndpoint: config.public.arweaveEndpoint,
      ipfsEndpoint: config.public.ipfsEndpoint,
    })
  }

  return {
    normalizeURIToHTTP,
  }
}
