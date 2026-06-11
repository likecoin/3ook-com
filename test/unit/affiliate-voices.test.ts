import { describe, expect, it } from 'vitest'
import { getAffiliateVoicesForBook } from '~/composables/use-plus-affiliate'
import type { AffiliatePublicConfig } from '~~/shared/types/affiliate'

const VOICES = [{ id: 'chiming', name: 'Chiming' }]

// Publisher wallets are stored checksummed (EIP-55), unlike the lowercased class IDs.
const PUBLISHER_WALLET = '0xabCDeF0123456789AbcdEf0123456789aBCDEF01'
const STRANGER_WALLET = '0xfEdcBA9876543210FedCBa9876543210fEdCBa98'

const activeConfig: AffiliatePublicConfig = {
  active: true,
  affiliateClassIds: ['0xaaa'],
  affiliatePublisherWallets: [PUBLISHER_WALLET],
  customVoices: VOICES,
}

describe('getAffiliateVoicesForBook', () => {
  it('returns no voices when config is null or inactive', () => {
    expect(getAffiliateVoicesForBook(null, '0xaaa')).toEqual([])
    expect(getAffiliateVoicesForBook({ active: false }, '0xaaa')).toEqual([])
  })

  it('returns no voices when nftClassId is missing', () => {
    expect(getAffiliateVoicesForBook(activeConfig, undefined)).toEqual([])
  })

  it('grants voices when the book is in affiliateClassIds (case-insensitive)', () => {
    expect(getAffiliateVoicesForBook(activeConfig, '0xAAA')).toEqual(VOICES)
  })

  it('grants voices when the book is listed by a publisher wallet (checksum-insensitive)', () => {
    // Lowercased owner wallet still matches the checksummed config entry.
    expect(getAffiliateVoicesForBook(activeConfig, '0xother', PUBLISHER_WALLET.toLowerCase())).toEqual(VOICES)
  })

  it('denies when neither the classId nor the owner wallet match', () => {
    expect(getAffiliateVoicesForBook(activeConfig, '0xother', STRANGER_WALLET)).toEqual([])
    expect(getAffiliateVoicesForBook(activeConfig, '0xother')).toEqual([])
  })
})
