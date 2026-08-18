// `middleware/query.global.ts` copies link tags onto any navigation whose target
// sets none of its own, so an event that inherits the route's tag can name a
// surface the reader never used. The middleware records what it copied here.
export interface CarriedLinkTags {
  isLLMediumCarried: boolean
  isLLSourceCarried: boolean
}

export function useCarriedLinkTags() {
  return useState<CarriedLinkTags>('carried-link-tags', () => ({
    isLLMediumCarried: false,
    isLLSourceCarried: false,
  }))
}
