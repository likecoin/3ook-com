export function useURIParser() {
  const config = useRuntimeConfig()

  function normalizeURIToHTTP(url?: string) {
    if (!url) return ''
    const [schema, path] = url.split('://')
    if (schema === 'ar') return `${config.public.arweaveEndpoint}/${path}`
    if (schema === 'ipfs') return `${config.public.ipfsEndpoint}/${path}`
    return url
  }

  return {
    normalizeURIToHTTP,
  }
}
