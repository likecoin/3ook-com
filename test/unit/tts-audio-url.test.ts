import { describe, expect, it } from 'vitest'
import {
  buildTTSAudioURL,
  parseLanguageVoice,
  resolvePrivateVoiceLanguage,
} from '~/utils/tts-audio-url'
import { computeTTSTextSig, encodeAffiliateVoiceId } from '~~/shared/utils/tts-sig'
import type { AffiliateVoiceData, CustomVoiceData } from '~~/shared/types/custom-voice'

const NFT_CLASS_ID = '0xAbCd1234'
const TEXT = '這是一段測試文字。'

function parseTTSURL(url: string) {
  const [path, query] = url.split('?')
  return { path, params: new URLSearchParams(query) }
}

describe('parseLanguageVoice', () => {
  it('splits language and voice id on the first underscore', () => {
    expect(parseLanguageVoice('zh-HK_phoebe')).toEqual({ language: 'zh-HK', voiceId: 'phoebe' })
  })

  it('keeps underscores inside the voice id', () => {
    expect(parseLanguageVoice('en-US_male_deep')).toEqual({ language: 'en-US', voiceId: 'male_deep' })
  })

  it('handles a bare language with no voice id', () => {
    expect(parseLanguageVoice('zh-HK')).toEqual({ language: 'zh-HK', voiceId: '' })
  })
})

describe('resolvePrivateVoiceLanguage', () => {
  it('forces en-US for English books regardless of voice language', () => {
    expect(resolvePrivateVoiceLanguage({ bookLanguage: 'en', voiceLanguage: 'zh-TW' })).toBe('en-US')
    expect(resolvePrivateVoiceLanguage({ bookLanguage: 'en-GB' })).toBe('en-US')
  })

  it('prefers the voice language for non-English books', () => {
    expect(resolvePrivateVoiceLanguage({ bookLanguage: 'zh-TW', voiceLanguage: 'zh-TW' })).toBe('zh-TW')
  })

  it('falls back to zh-HK when no language is known', () => {
    expect(resolvePrivateVoiceLanguage({})).toBe('zh-HK')
    expect(resolvePrivateVoiceLanguage({ bookLanguage: 'zh-HK' })).toBe('zh-HK')
  })
})

describe('buildTTSAudioURL (system voice)', () => {
  it('builds the endpoint URL with text, language, voice_id, nft_class_id, sig in order', () => {
    const url = buildTTSAudioURL(TEXT, {
      nftClassId: NFT_CLASS_ID,
      languageVoice: 'zh-HK_phoebe',
    })
    const { path, params } = parseTTSURL(url)
    expect(path).toBe('/api/reader/tts')
    expect([...params.keys()]).toEqual(['text', 'language', 'voice_id', 'nft_class_id', 'sig'])
    expect(params.get('text')).toBe(TEXT)
    expect(params.get('language')).toBe('zh-HK')
    expect(params.get('voice_id')).toBe('phoebe')
    expect(params.get('nft_class_id')).toBe(NFT_CLASS_ID)
  })

  it('signs system voices with an empty token so URLs converge across users', () => {
    const url = buildTTSAudioURL(TEXT, {
      nftClassId: NFT_CLASS_ID,
      languageVoice: 'zh-HK_phoebe',
      // ttsKey must NOT leak into system-voice sigs
      ttsKey: 'user-secret-key',
    })
    const { params } = parseTTSURL(url)
    expect(params.get('sig')).toBe(computeTTSTextSig({
      token: '',
      voiceId: 'phoebe',
      language: 'zh-HK',
      nftClassId: NFT_CLASS_ID,
      text: TEXT,
    }))
  })

  it('appends blocking=1 for native bridge requests', () => {
    const url = buildTTSAudioURL(TEXT, {
      nftClassId: NFT_CLASS_ID,
      languageVoice: 'zh-HK_phoebe',
      isBlocking: true,
    })
    expect(parseTTSURL(url).params.get('blocking')).toBe('1')
  })
})

describe('buildTTSAudioURL (custom voice)', () => {
  const customVoice = {
    voiceId: 'v1',
    voiceName: 'My Voice',
    voiceLanguage: 'zh-TW',
    updatedAt: 1751900000000,
  } as CustomVoiceData

  it('signs with the per-user ttsKey and appends the updatedAt cache buster', () => {
    const url = buildTTSAudioURL(TEXT, {
      nftClassId: NFT_CLASS_ID,
      languageVoice: 'custom',
      bookLanguage: 'zh-TW',
      ttsKey: 'user-secret-key',
      customVoice,
    })
    const { params } = parseTTSURL(url)
    expect(params.get('voice_id')).toBe('custom')
    expect(params.get('language')).toBe('zh-TW')
    expect(params.get('_t')).toBe('1751900000000')
    expect(params.get('sig')).toBe(computeTTSTextSig({
      token: 'user-secret-key',
      voiceId: 'custom',
      language: 'zh-TW',
      nftClassId: NFT_CLASS_ID,
      text: TEXT,
    }))
  })

  it('omits the cache buster when the voice has no updatedAt', () => {
    const url = buildTTSAudioURL(TEXT, {
      nftClassId: NFT_CLASS_ID,
      languageVoice: 'custom',
      customVoice: { ...customVoice, updatedAt: undefined } as CustomVoiceData,
    })
    expect(parseTTSURL(url).params.has('_t')).toBe(false)
  })
})

describe('buildTTSAudioURL (affiliate voice)', () => {
  const affiliateVoiceId = encodeAffiliateVoiceId('chiming')
  const affiliateVoices = [
    { id: 'chiming', name: 'Chiming', language: 'zh-HK' },
  ] as AffiliateVoiceData[]

  it('uses the encoded affiliate id as voice_id and signs with the ttsKey', () => {
    const url = buildTTSAudioURL(TEXT, {
      nftClassId: NFT_CLASS_ID,
      languageVoice: affiliateVoiceId,
      bookLanguage: 'zh-HK',
      ttsKey: 'user-secret-key',
      affiliateVoices,
    })
    const { params } = parseTTSURL(url)
    expect(params.get('voice_id')).toBe(affiliateVoiceId)
    expect(params.get('language')).toBe('zh-HK')
    expect(params.get('sig')).toBe(computeTTSTextSig({
      token: 'user-secret-key',
      voiceId: affiliateVoiceId,
      language: 'zh-HK',
      nftClassId: NFT_CLASS_ID,
      text: TEXT,
    }))
  })

  it('falls back to zh-HK when the affiliate slot is unknown', () => {
    const url = buildTTSAudioURL(TEXT, {
      nftClassId: NFT_CLASS_ID,
      languageVoice: encodeAffiliateVoiceId('missing'),
      affiliateVoices,
    })
    expect(parseTTSURL(url).params.get('language')).toBe('zh-HK')
  })
})
