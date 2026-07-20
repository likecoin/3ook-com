// Durable breadcrumb for the TTS offline modal. posthog-js keeps failed
// captures only in memory, so an impression logged while offline is lost if the
// user kills the app before reconnecting — exactly the frustrated cohort we
// most want to measure. We persist the impression here and, on next launch,
// report any that never resolved as an 'abandoned' outcome (see the
// tts-offline-abandoned plugin).
const TTS_OFFLINE_MODAL_KEY = 'tts-offline-modal-pending'

// The full set of tts_offline_modal_resolved outcomes. Three are produced live
// by the composable; 'abandoned' only by the next-launch recovery. Shared so
// the vocabulary can't drift between the two emitters.
export type TTSOfflineModalOutcome = 'reconnected' | 'manual_resume' | 'stopped' | 'abandoned'

export interface PendingOfflineModal {
  shownAt: number
  // The base TTS event payload captured at show time, replayed verbatim so the
  // abandoned event carries the same book/voice/session context as the live one.
  payload: Record<string, unknown>
}

export function setPendingOfflineModal(entry: PendingOfflineModal) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(TTS_OFFLINE_MODAL_KEY, JSON.stringify(entry))
  }
  catch {
    // Storage unavailable or full — best-effort; the live event still fires.
  }
}

export function readPendingOfflineModal(): PendingOfflineModal | null {
  if (!import.meta.client) return null
  let raw: string | null = null
  try {
    raw = localStorage.getItem(TTS_OFFLINE_MODAL_KEY)
  }
  catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<PendingOfflineModal>
    const { shownAt, payload } = parsed
    if (typeof shownAt === 'number' && Number.isFinite(shownAt)
      && typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
      return { shownAt, payload }
    }
  }
  catch {
    // Fall through to drop the corrupt blob.
  }
  // Invalid or unparsable — clear it so it isn't re-read on every launch, and
  // a non-object payload can't leak into the replayed event params.
  clearPendingOfflineModal()
  return null
}

export function clearPendingOfflineModal() {
  if (!import.meta.client) return
  try {
    localStorage.removeItem(TTS_OFFLINE_MODAL_KEY)
  }
  catch {
    // Best-effort.
  }
}
