import { useStorage } from '@vueuse/core'
import { COUNTRY_CODES } from '~~/shared/constants/country-codes'
import type { RegionCode } from '~~/shared/types/user-settings'

const DEFAULT_REGION: RegionCode = 'HK'

const COUNTRY_CODE_SET = new Set<string>(COUNTRY_CODES)

// One ref per document, not per call: useStorage defers its write-back a tick,
// so a sibling copy would still read the old value when initializeRegion
// resolves in the same tick.
const localStorageRegion = useStorage<string>('user_region', '')

export function parseRegionCode(value: string | null | undefined): RegionCode | undefined {
  if (!value) return undefined
  const code = value.toUpperCase()
  return COUNTRY_CODE_SET.has(code) ? code : undefined
}

function useRegionState() {
  return useState<RegionCode | undefined>('user-region', () => undefined)
}

// Read-only view of the resolved region. The full composable wires settings
// sync, a watcher and lifecycle hooks per call — per-card consumers (a store
// grid holds ~100) must not multiply that when they only need the value.
export function useRegionValue(): Readonly<Ref<RegionCode | undefined>> {
  return readonly(useRegionState())
}

export function useRegion() {
  const userSettingsStore = useUserSettingsStore()
  const { loggedIn: hasLoggedIn } = useUserSession()
  const { detectedCountry, initializeClientGeolocation } = useDetectedGeolocation()

  const syncedRegion = useSyncedUserSettings({
    key: 'region',
    defaultValue: DEFAULT_REGION,
  })

  // `undefined` until initializeRegion() resolves, so the UI can show a
  // placeholder instead of a concrete region the user may not actually be in.
  const region = useRegionState()

  // User action: persist the concrete country. IP is no longer consulted once set.
  function setRegion(value: RegionCode) {
    useLogEvent('region_change', {
      region: value,
      previous_region: region.value,
    })
    useSetLogPersonProperties({ region: value })
    if (hasLoggedIn.value) {
      syncedRegion.value = value
    }
    else {
      localStorageRegion.value = value
    }
    region.value = value
  }

  function getDetectedOrDefaultRegion(): RegionCode {
    return parseRegionCode(detectedCountry.value) || DEFAULT_REGION
  }

  // Drop the guest copy on logout so the next account starts from its own saved region,
  // not whatever this browser was left holding. Driven from app.vue, once, because
  // watching here would repeat the reset for every caller.
  function resetRegionForGuest() {
    localStorageRegion.value = ''
    region.value = getDetectedOrDefaultRegion()
  }

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
      || getDetectedOrDefaultRegion()
  }

  return {
    region: readonly(region),
    setRegion,
    initializeRegion,
    resetRegionForGuest,
  }
}
