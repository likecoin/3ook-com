import { useStorage } from '@vueuse/core'
import { COUNTRY_CODES } from '~~/shared/constants/country-codes'
import type { RegionCode } from '~~/shared/types/user-settings'

const DEFAULT_REGION: RegionCode = 'HK'

const COUNTRY_CODE_SET = new Set<string>(COUNTRY_CODES)

export function parseRegionCode(value: string | null | undefined): RegionCode | undefined {
  if (!value) return undefined
  const code = value.toUpperCase()
  return COUNTRY_CODE_SET.has(code) ? code : undefined
}

export function useRegion() {
  const userSettingsStore = useUserSettingsStore()
  const { loggedIn: hasLoggedIn } = useUserSession()
  const { detectedCountry, initializeClientGeolocation } = useDetectedGeolocation()

  const syncedRegion = useSyncedUserSettings({
    key: 'region',
    defaultValue: DEFAULT_REGION,
  })

  const localStorageRegion = useStorage<string>('user_region', '')

  // `undefined` until initializeRegion() resolves, so the UI can show a
  // placeholder instead of a concrete region the user may not actually be in.
  const region = useState<RegionCode | undefined>('user-region', () => undefined)

  // User action: persist the concrete country. IP is no longer consulted once set.
  function setRegion(value: RegionCode) {
    if (hasLoggedIn.value) {
      syncedRegion.value = value
    }
    else {
      localStorageRegion.value = value
    }
    region.value = value
  }

  watch(hasLoggedIn, (isLoggedIn, wasLoggedIn) => {
    if (wasLoggedIn && !isLoggedIn) {
      // Drop the guest copy on logout so the next account starts from its own saved region,
      // not whatever this browser was left holding.
      localStorageRegion.value = ''
      region.value = parseRegionCode(detectedCountry.value) || DEFAULT_REGION
    }
    else if (isLoggedIn && !wasLoggedIn) {
      // Login is a route change, not a reload, so pull this account's saved region now
      // otherwise it stays on the guest/detected value.
      initializeRegion()
    }
  })

  // Resolve the pre-selected region.
  // A merely IP-detected default is not persisted,
  // so re-detection keeps working until the user actively picks.
  async function initializeRegion() {
    if (!detectedCountry.value) {
      initializeClientGeolocation()
    }

    let storedRegion: RegionCode | undefined
    if (hasLoggedIn.value) {
      await userSettingsStore.ensureInitialized()
      storedRegion = parseRegionCode(userSettingsStore.getSettings()?.region)
    }

    region.value = storedRegion
      || parseRegionCode(localStorageRegion.value)
      || parseRegionCode(detectedCountry.value)
      || DEFAULT_REGION
  }

  return {
    region: readonly(region),
    setRegion,
    initializeRegion,
  }
}
