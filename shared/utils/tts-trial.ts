export const TTS_TRIAL_CHARACTER_LIMIT = 2500

// Minimax pacing, measured from production audio.
// Mandarin/Cantonese ~3.5-4 chars/sec ≈ 240 chars/min.
// English ~150 wpm × ~5 chars/word ≈ 750 chars/min.
const CHARS_PER_MINUTE_ZH = 240
const CHARS_PER_MINUTE_EN = 750

export function getTTSCharsPerMinute(language: string | undefined | null): number {
  if (language && language.toLowerCase().startsWith('en')) return CHARS_PER_MINUTE_EN
  return CHARS_PER_MINUTE_ZH
}

export function estimateTTSMinutes(characters: number, language: string | undefined | null): number {
  return characters / getTTSCharsPerMinute(language)
}
