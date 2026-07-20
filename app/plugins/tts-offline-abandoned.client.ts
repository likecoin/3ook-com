// Replay any TTS offline modal that was shown last session but never resolved
// as an 'abandoned' outcome — see utils/tts-offline-modal for why this exists.
export default defineNuxtPlugin(() => {
  const pending = readPendingOfflineModal()
  if (!pending) return

  const { onLoaded } = useScriptPostHog()
  onLoaded(() => {
    useLogEvent('tts_offline_modal_resolved', {
      ...pending.payload,
      // Duration is unknown — we never saw the close — so report the outcome only.
      outcome: 'abandoned' satisfies TTSOfflineModalOutcome,
    })
    // Clear only after the event is queued to posthog (inside onLoaded), so a
    // session where posthog never loads keeps the marker for the next launch
    // instead of dropping it.
    clearPendingOfflineModal()
  })
})
