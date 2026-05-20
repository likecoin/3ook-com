import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { clampPacedDeltas, type PacedDeltas } from '~~/shared/utils/analytics-pacing'

export async function applyWallClockPacing(
  userWallet: string,
  nftClassId: string,
  requested: PacedDeltas,
): Promise<PacedDeltas> {
  const pacingRef = getUserCollection()
    .doc(userWallet)
    .collection('pacing')
    .doc(nftClassId.toLowerCase())

  return getFirestoreDb().runTransaction(async (transaction) => {
    const doc = await transaction.get(pacingRef)
    const data = doc.data()
    const now = Date.now()
    const today = toUTCDateString(new Date(now))

    const isNewDay = !data || data.todayDate !== today
    // Clamp against the stored heartbeat even across a UTC day boundary —
    // otherwise the first beat after midnight is unpaced and a client could
    // burst a max-delta beat on each side of the rollover.
    const lastHeartbeatMs = data?.lastHeartbeatAt instanceof Timestamp
      ? data.lastHeartbeatAt.toMillis()
      : null

    const paced = clampPacedDeltas(requested, lastHeartbeatMs, now)

    transaction.set(pacingRef, {
      todayDate: today,
      lastHeartbeatAt: FieldValue.serverTimestamp(),
      accumulatedActiveTodayMs: isNewDay
        ? paced.activeReadingTimeMsDelta
        : FieldValue.increment(paced.activeReadingTimeMsDelta),
      accumulatedTTSTodayMs: isNewDay
        ? paced.ttsActiveTimeMsDelta
        : FieldValue.increment(paced.ttsActiveTimeMsDelta),
    }, { merge: true })

    return paced
  })
}
