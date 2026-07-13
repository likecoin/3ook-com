import { describe, expect, it } from 'vitest'
import {
  COUNTRIES,
  COUNTRY_CODES,
  PRIORITY_COUNTRY_CODES,
} from '~~/shared/constants/countries'

describe('country constants', () => {
  it('uses unique ISO-3166-1 alpha-2 codes', () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length)
    for (const code of COUNTRY_CODES) {
      expect(code).toMatch(/^[A-Z]{2}$/)
    }
  })

  it('has an English and zh-Hant name for every country', () => {
    for (const country of COUNTRIES) {
      expect(country.name.en, country.code).toBeTruthy()
      expect(country.name['zh-Hant'], country.code).toBeTruthy()
    }
  })

  it('includes every priority code', () => {
    for (const code of PRIORITY_COUNTRY_CODES) {
      expect(COUNTRY_CODES).toContain(code)
    }
  })
})
