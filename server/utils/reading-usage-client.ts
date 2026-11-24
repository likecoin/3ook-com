import { randomUUID } from 'node:crypto'
import { API_MAX_RETRIES } from '~~/shared/utils/fetch-retry'

interface ReadingUsageInput {
  isBorrowed: boolean
  readerWallet: string
  classId: string
  readingTimeMs: number
  ttsTimeMs: number
  // Reader's country, for the ledger's per-region usage totals. Omitted when the
  // request carried no country header — an unattributed read, not a guessed one.
  ipCountry?: string
}

/**
 * Forwards paced reading/TTS usage to the likecoin-api reading-usage ledger.
 * The shared service secret (not the user JWT) is what proves the usage passed through
 * this backend's wall-clock pacing — the anti-fraud boundary the payout pipeline trusts.
 * Borrowed reads go as library time, the rest as non-library engagement for publisher stats.
 * isBorrowed is only ever true for a current Plus reader (see incrementBookReadingTime);
 * whether that Plus is funded (paid vs trial, VIP, 100% coupon) is left to the API,
 * which demotes unfunded library time to non-library against the reader's Plus record.
 * Best-effort: errors are logged, never thrown, so it never blocks session bookkeeping;
 * still awaited so it settles before the serverless handler returns.
 *
 * Each call carries a unique `id` so the API can dedup retries: the ledger increments are
 * non-idempotent, but ofetch resends the same body (same id) on a transient `<no response>`,
 * and the API skips an already-seen id. That's what makes enabling retry here safe — it must
 * stay paired with the API-side dedup (deploy the API before this).
 */
export async function forwardReadingUsage(input: ReadingUsageInput): Promise<void> {
  const { isBorrowed, readerWallet, classId, readingTimeMs, ttsTimeMs, ipCountry } = input
  if (readingTimeMs <= 0 && ttsTimeMs <= 0) return

  const config = useRuntimeConfig()
  const token = config.plusReadingServiceToken
  if (!token) return // unset (e.g. local dev) — skip silently

  try {
    await getLikeCoinAPIFetch()('/plus/reading/usage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        // Generated once per call; reused across retries so duplicates dedup server-side.
        id: randomUUID(),
        readerWallet,
        classId,
        readingTimeMs: isBorrowed ? readingTimeMs : 0,
        ttsTimeMs: isBorrowed ? ttsTimeMs : 0,
        nonLibraryReadingTimeMs: isBorrowed ? 0 : readingTimeMs,
        nonLibraryTtsTimeMs: isBorrowed ? 0 : ttsTimeMs,
        ipCountry,
      },
      // Opt this POST into retry (the wrapper leaves payload methods at 0 by default);
      // safe now that the API dedups on `id`. Must equal API_MAX_RETRIES — the backoff
      // curve assumes a retry budget starting there.
      retry: API_MAX_RETRIES,
      timeout: 2000, // per-attempt cap on a hung upstream; total may exceed it across retries (failures swallowed below)
    })
  }
  catch (error) {
    console.warn('[ReadingUsage] Failed to forward reading usage:', error)
  }
}
