import { COUNTRIES, PRIORITY_COUNTRY_CODES } from '~~/shared/constants/countries'
import type { Country } from '~~/shared/constants/countries'
import type { RegionCode } from '~~/shared/types/user-settings'

const PRIORITY_COUNTRY_CODE_SET = new Set<string>(PRIORITY_COUNTRY_CODES)

// Selector presentation (localized names, ordering, label), kept out of
// `use-region.ts` so region state stays independent of how it is rendered.
// Building the list once here also keeps the card and the switcher in sync.
export function useRegionOptions() {
  const { locale } = useI18n()
  const { region } = useRegion()

  const getCountryLabel = (country: Country) => country.name[locale.value] ?? country.name.en

  // Priority regions first, then the rest sorted by their displayed label.
  // `name` (English) is kept alongside the localized `label` so search matches both.
  const options = computed<Array<{ label: string, name: string, value: RegionCode }>>(() => {
    const priority = PRIORITY_COUNTRY_CODES
      .map(code => COUNTRIES.find(country => country.code === code))
      .filter((country): country is Country => Boolean(country))
    const rest = COUNTRIES
      .filter(country => !PRIORITY_COUNTRY_CODE_SET.has(country.code))
      .sort((a, b) => getCountryLabel(a).localeCompare(getCountryLabel(b), locale.value))
    return [...priority, ...rest].map(country => ({
      label: getCountryLabel(country),
      name: country.name.en,
      value: country.code,
    }))
  })

  // Placeholder while the region is still resolving,
  // so a not-yet-known region never renders as a concrete country.
  const regionLabel = computed(() => {
    if (!region.value) return '-'
    return options.value.find(option => option.value === region.value)?.label ?? '-'
  })

  return {
    options,
    regionLabel,
  }
}
