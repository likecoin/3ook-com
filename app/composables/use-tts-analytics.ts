import { isAffiliateVoiceId } from '~~/shared/utils/tts-sig'

interface TTSAnalyticsOptions {
  nftClassId: string
  ttsSessionId: Ref<string>
  ttsLanguageVoice: Ref<string>
  effectivePlaybackRate: Ref<number>
  currentTTSSegmentIndex: Ref<number>
  ttsSegments: Ref<TTSSegment[]>
  bookLanguage?: MaybeRefOrGetter<string>
  isLibraryBook?: MaybeRefOrGetter<boolean>
}

// Shared payload builder for tts_* analytics events.
export function useTTSAnalytics(options: TTSAnalyticsOptions) {
  const {
    ttsSessionId,
    ttsLanguageVoice,
    effectivePlaybackRate,
    currentTTSSegmentIndex,
    ttsSegments,
  } = options

  const { user: sessionUser } = useUserSession()
  const ttsTrialUsage = useTTSTrialUsage()
  const { isApp, appPlatform } = useAppDetection()

  function resolveVoiceTier(languageVoice: string): 'system' | 'affiliate' | 'custom' {
    if (languageVoice === 'custom') return 'custom'
    if (isAffiliateVoiceId(languageVoice)) return 'affiliate'
    return 'system'
  }

  function buildTTSEventPayload(extras: Record<string, unknown> = {}) {
    const languageVoice = ttsLanguageVoice.value || ''
    const { voiceId } = parseLanguageVoice(languageVoice)
    return {
      nft_class_id: options.nftClassId,
      tts_session_id: ttsSessionId.value || undefined,
      is_liker_plus_at_event_time: !!sessionUser.value?.isLikerPlus,
      is_library_book: !!toValue(options.isLibraryBook),
      ...(ttsTrialUsage.isLoaded.value
        ? {
            cumulative_chars_used: ttsTrialUsage.charactersUsed.value,
            chars_remaining: ttsTrialUsage.charactersRemaining.value,
          }
        : {}),
      book_language: toValue(options.bookLanguage) || undefined,
      voice_id: voiceId || languageVoice || undefined,
      language_voice: languageVoice || undefined,
      voice_tier: resolveVoiceTier(languageVoice),
      playback_rate: effectivePlaybackRate.value,
      current_segment_index: currentTTSSegmentIndex.value,
      total_segments: ttsSegments.value.length,
      app_platform: appPlatform.value,
      is_app: isApp.value,
      ...extras,
    }
  }

  function logSkip(
    event: 'tts_skip_forward' | 'tts_skip_backward' | 'tts_skip_to_index',
    fromIndex: number,
    toIndex: number,
  ) {
    useLogEvent(event, buildTTSEventPayload({
      from_index: fromIndex,
      to_index: toIndex,
    }))
  }

  return {
    buildTTSEventPayload,
    logSkip,
  }
}
