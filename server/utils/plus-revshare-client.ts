interface PlusReadingUsageInput {
  isPaidPlus: boolean
  isBorrowed: boolean
  readerWallet: string
  classId: string
  readingTimeMs: number
  ttsTimeMs: number
}

/**
 * Forwards paced Plus reading/TTS usage to the likecoin-api revenue-share ledger.
 * The shared service secret (not the user JWT) is what proves the usage passed through
 * this backend's wall-clock pacing — the anti-fraud boundary the payout pipeline trusts.
 * Best-effort: errors are logged, never thrown, so it never blocks reading-session
 * bookkeeping; still awaited so it settles before the serverless handler returns.
 */
export async function forwardPlusReadingUsage(input: PlusReadingUsageInput): Promise<void> {
  // Reading counts only for borrowed books, TTS for any book — both only for paid
  // (non-trial) Plus, since trial usage must never fund the pool.
  if (!input.isPaidPlus) return
  const { ttsTimeMs, readerWallet, classId } = input
  const readingTimeMs = input.isBorrowed ? input.readingTimeMs : 0
  if (readingTimeMs <= 0 && ttsTimeMs <= 0) return

  const config = useRuntimeConfig()
  const token = config.plusReadingServiceToken
  if (!token) return // unset (e.g. local dev) — skip silently

  try {
    await getLikeCoinAPIFetch()('/plus/reading/usage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { readerWallet, classId, readingTimeMs, ttsTimeMs },
    })
  }
  catch (error) {
    console.warn('[PlusRevShare] Failed to forward reading usage:', error)
  }
}
