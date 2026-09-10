// The two store listing tabs, and the publisher-storefront child each one gets
// at /<tab>/@<likerId>. Shared with nuxt.config.ts, which registers the child
// routes, so a rename can't silently drop the route or the canonical link.
export const STORE_LISTING_ROUTE_NAMES = ['store', 'library'] as const

export type StoreListingRouteName = typeof STORE_LISTING_ROUTE_NAMES[number]

export const STORE_PUBLISHER_ROUTE_PATH = '@:userId'

export const NFT_CLASS_ID_ROUTE_REGEX = '0x[0-9a-fA-F]+'

export function getStorePublisherRouteName(listingRouteName: StoreListingRouteName | string) {
  return `${listingRouteName}-userId`
}

// The store storefront once more, served at the root of a publisher subdomain,
// where the likerId comes from the host instead of the path.
export const STORE_PUBLISHER_ROOT_ROUTE_NAME = 'store-root'

export const STORE_PUBLISHER_ROUTE_NAMES: string[] = [
  ...STORE_LISTING_ROUTE_NAMES.map(getStorePublisherRouteName),
  STORE_PUBLISHER_ROOT_ROUTE_NAME,
]
