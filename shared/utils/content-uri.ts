interface ContentURIEndpoints {
  arweaveEndpoint: string
  ipfsEndpoint: string
}

// `ar://` and `ipfs://` are metadata schemes the browser can't fetch.
// Both the client renderer and the server cover proxy resolve them here,
// or a cover that paints on the page would fail in the image export.
export function normalizeContentURIToHTTP(
  url: string | undefined,
  { arweaveEndpoint, ipfsEndpoint }: ContentURIEndpoints,
): string {
  if (!url) return ''
  const [schema, path] = url.split('://')
  if (schema === 'ar') return `${arweaveEndpoint}/${path}`
  if (schema === 'ipfs') return `${ipfsEndpoint}/${path}`
  return url
}

// The LikeCoin thumbnail service, the only host the cover proxy connects to —
// publisher-supplied image URLs are wrapped, never fetched.
export function getThumbnailURL(
  imageURL: string,
  { likeCoinStaticEndpoint, size }: { likeCoinStaticEndpoint: string, size?: number },
): string {
  if (!imageURL) return ''
  const params = new URLSearchParams()
  params.set('url', imageURL)
  if (size) params.set('width', size.toString())
  return `${likeCoinStaticEndpoint}/thumbnail/?${params.toString()}`
}
