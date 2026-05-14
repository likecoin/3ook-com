export function useImageResize() {
  const config = useRuntimeConfig()
  const { normalizeURIToHTTP } = useURIParser()

  function getResizedImageURL(imageURL: string, { size }: { size?: number } = {}) {
    if (!imageURL) return ''

    const params = new URLSearchParams()
    params.set('url', imageURL)
    if (size) params.set('width', size.toString())
    return `${config.public.likeCoinStaticEndpoint}/thumbnail/?${params.toString()}`
  }

  function getResizedNormalizedImageURL(imageURL: string, { size }: { size?: number } = {}) {
    const normalizedURL = normalizeURIToHTTP(imageURL)
    const resizedURL = getResizedImageURL(normalizedURL, { size })
    return resizedURL
  }

  return {
    getResizedImageURL,
    getResizedNormalizedImageURL,
  }
}
