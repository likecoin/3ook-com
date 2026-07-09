import { normalizeLikerId } from '~~/shared/utils/liker-id'

// Static example text for the public TTS sample endpoint. Hardcoding the text
// per language closes the abuse vector: without auth + sig, an arbitrary
// `text=` param would let anyone burn Minimax tokens against our cache. With
// fixed text, every cache miss synthesizes at most once per (voice, language).
export type TTSSampleLanguage = 'en-US' | 'zh-TW' | 'zh-HK'

export const TTS_SAMPLE_TEXT_BY_LANGUAGE: Record<TTSSampleLanguage, string> = {
  'zh-HK': '其實我一直覺得，閱讀是一件很浪漫的事。不管是手捧著實體書，還是滑著電子螢幕，只要沉浸在故事裡，就能暫時忘掉現實的煩惱，去到一個完全不同的時空。',
  'zh-TW': '其實我一直覺得，閱讀是一件很浪漫的事。不管是手捧著實體書，還是滑著電子螢幕，只要沉浸在故事裡，就能暫時忘掉現實的煩惱，去到一個完全不同的時空。',
  'en-US': 'I\'ve always felt that reading is something truly romantic. Whether you\'re holding a physical book or scrolling on a screen, as long as you\'re immersed in a story, you can briefly forget your worries and travel to an entirely different world.',
}

export function getTTSSampleText(language: TTSSampleLanguage): string {
  return TTS_SAMPLE_TEXT_BY_LANGUAGE[language]
}

// Per-affiliate-voice curated demo scripts. The text is server-controlled and
// looked up by (likerId, voiceSlot); the client only sends the segment index,
// preserving the abuse-vector closure of the public sample endpoint.
export interface AffiliateSampleScript {
  language: TTSSampleLanguage
  segments: string[]
  attribution?: TTSSampleAttribution
}

// Pre-chunked to match the reader's runtime segmentation
// (splitTextIntoSegments + mergeShortTTSSegments in utils/tts.ts, ~100 char cap).
// Regenerate if the source text changes.
const KAIMING_CHIMING_SCRIPT: AffiliateSampleScript = {
  language: 'zh-TW',
  segments: [
    '整個世界，整個真實世界，在三隻飛蟲逃跑後，進入了我的房間。就在這裡重新包圍我，和我融在一起。',
    '此刻，我聽著所有聲響，不由自主地捕捉它們在這個空間的位置：我的呼吸彷彿造風箱輕柔的聲音；我的身體不經意的動作壓得床鋪嘎吱響；那兒傳來一隻蟑螂搔著壁紙起縐部分的聲音；',
    '外面，人們正在內院裡說話，他們講話的同時，幾扇窗戶亮起，整棟大樓變幻成不同面貌，聖壇社宅的燈光灑在通往四面八方的街道上，那兒同時響起各種聲音：',
    '一輛汽車、一輛電車，整座城市所有居民不斷的低語；我的太太在隔壁，她有一頭栗子色秀髮，睜著一雙惺忪睡眼；隔壁的房間是完美的正方形；我有兩個桃花心木家具；',
    '爸爸住在聖心街；我伸出指腹觸摸床單；今天就快落幕，前一天過去了，明天緊接著而來，然後再一個明天，然後再一個，然後再一個，我會移動雙腳繼續前進，以免往前撲一跤。',
    '我聽到，我看到，我感覺到一切。一陣幽微的山茶花香飄來。',
    '我聽到，我看到，我感覺到，我活著。何必懷疑？我的大腦已經排空，頓悟從連通管流向低處的現實。再會，廁所和所有一切！我知道，每當我額頭抵著右手，任由自然之力流淌過我，我就能靈光一閃，豁然開朗。',
    '而現在我躺在床上，接著明天早上會起床，然後再回到床上過夜。吃飯、寒暄、評論、做夢、打呵欠、愛人，最後睡覺，為了能夠醒來，能夠開始一天又一天，和我的同類、空氣、土地，和生活肩並肩，身體挨著身體。',
  ],
  attribution: {
    text: '出自《懸停日日》',
    nftClassId: '0x4d69ecb8da3b16d5828ec0dcd17b1310cb96d3a0',
  },
}

// Duplicate prod+testnet liker IDs so sepolia QA matches prod — mirrors the
// pattern in AFFILIATE_DEFINITIONS (composables/use-pricing-page-campaign.ts).
const AFFILIATE_SAMPLE_SCRIPTS: Record<string, Record<string, AffiliateSampleScript>> = {
  bsymfp: { chiming: KAIMING_CHIMING_SCRIPT },
  gpzauz: { chiming: KAIMING_CHIMING_SCRIPT },
}

export function getAffiliateSampleScript(
  likerId: string | undefined,
  voiceSlot: string | undefined,
): AffiliateSampleScript | undefined {
  if (!likerId || !voiceSlot) return undefined
  return AFFILIATE_SAMPLE_SCRIPTS[normalizeLikerId(likerId)]?.[voiceSlot]
}

// Built-in TTS voices lent by their owner. A referral from the owner surfaces
// their voice sample even when they have no affiliate config or custom voice.
export interface SystemVoice {
  voiceId: string
  name: string
  language: TTSSampleLanguage
}

// Keyed by owner Liker ID. Unlike AFFILIATE_SAMPLE_SCRIPTS these have no
// testnet counterpart to duplicate — the owners hold no sepolia account.
const SYSTEM_VOICES_BY_OWNER: Record<string, SystemVoice> = {
  withthepoons: { voiceId: 'phoebe', name: 'Phoebe', language: 'zh-HK' },
  astrohsu99: { voiceId: 'astro', name: '許明恩', language: 'zh-TW' },
}

export function getSystemVoiceByOwnerLikerId(
  likerId: string | undefined,
): SystemVoice | undefined {
  if (!likerId) return undefined
  return SYSTEM_VOICES_BY_OWNER[normalizeLikerId(likerId)]
}
