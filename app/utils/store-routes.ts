import type { StoreListingRouteName } from '~~/shared/constants/store-routes'
import { STORE_LISTING_ROUTE_NAMES, STORE_PUBLISHER_ROUTE_NAMES } from '~~/shared/constants/store-routes'

// A listing route renders the store grid: the two tabs plus their publisher storefronts.
export function getIsStoreListingRouteName(name: string) {
  return STORE_LISTING_ROUTE_NAMES.includes(name as StoreListingRouteName) || STORE_PUBLISHER_ROUTE_NAMES.includes(name)
}

// Only the two tab routes carry the :tagId? segment; publisher storefronts keep ?tag=.
export function getIsStoreListingTabRouteName(name: string) {
  return STORE_LISTING_ROUTE_NAMES.includes(name as StoreListingRouteName)
}
