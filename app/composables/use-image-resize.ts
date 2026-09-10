export function useImageResize() {
  const config = useRuntimeConfig()
  const { normalizeURIToHTTP } = useURIParser()

  function getResizedImageURL(imageURL: string, { size }: { size?: number } = {}) {
    return getThumbnailURL(imageURL, {
      likeCoinStaticEndpoint: config.public.likeCoinStaticEndpoint,
      size,
    })
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
