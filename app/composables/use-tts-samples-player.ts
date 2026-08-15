import type { AffiliateVoiceData } from '~~/shared/types/custom-voice'
import type { TTSSampleAction } from '~~/shared/constants/analytics'
import type { SystemVoice, TTSSampleLanguage } from '~~/shared/utils/tts-sample'
import { encodeAffiliateVoiceId } from '~~/shared/utils/tts-sig'
import { getAffiliateSampleScript, getFlagshipSystemVoice, getSystemVoiceByOwnerLikerId, getTTSSampleText } from '~~/shared/utils/tts-sample'

interface TTSSamplesPlayerOptions {
  onError?: (error: unknown) => void
  onEnd?: () => void
  affiliateVoices?: MaybeRefOrGetter<AffiliateVoiceData[] | undefined>
  affiliateLikerId?: MaybeRefOrGetter<string | undefined>
  affiliateExclusiveBadgeText?: MaybeRefOrGetter<string | undefined>
}

// The spinner tracks readiness rather than the `waiting`/`playing` pairing:
// a `waiting` is not guaranteed a matching `playing`, and an unmatched one
// leaves the button spinning over audio that is already playing.
function getCanPlayNow(audio: HTMLAudioElement) {
  return audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
}

export function useTTSSamplesPlayer(options: TTSSamplesPlayerOptions = {}) {
  const { onError, onEnd, affiliateVoices, affiliateLikerId, affiliateExclusiveBadgeText } = options
  const { t: $t } = useI18n()
  const { detectedCountry } = useDetectedGeolocation()
  const affiliateVoicesComputed = computed(() => toValue(affiliateVoices) ?? [])
  const { getVoiceAvatar } = useTTSVoice({ affiliateVoices: affiliateVoicesComputed })

  function getSampleDescription(language: TTSSampleLanguage) {
    return language === 'zh-TW'
      ? $t('tts_sample_mandarin')
      : $t('tts_sample_cantonese')
  }

  const affiliateSamples = computed<TTSSample[]>(() => {
    const voices = affiliateVoicesComputed.value
    const likerId = toValue(affiliateLikerId)
    if (!voices.length || !likerId) return []
    const exclusiveBadgeText = toValue(affiliateExclusiveBadgeText)
    return voices.map((voice) => {
      const encodedVoiceId = encodeAffiliateVoiceId(voice.id)
      const script = getAffiliateSampleScript(likerId, voice.id)
      const language = script?.language
        ?? (voice.language?.toLowerCase().startsWith('zh-tw') ? 'zh-TW' : 'zh-HK')
      const sampleId = `affiliate-${voice.id}`
      const description = getSampleDescription(language)
      const segmentTexts = script?.segments ?? [getTTSSampleText(language)]
      const baseQuery = new URLSearchParams({
        voice_id: encodedVoiceId,
        language,
        from: likerId,
      }).toString()
      const segments = segmentTexts.map((text, index) => ({
        id: `${sampleId}-segment-${index}`,
        text,
        sectionIndex: 0,
        cfi: undefined,
        audioSrc: script
          ? `/api/tts/sample?${baseQuery}&seg=${index}`
          : `/api/tts/sample?${baseQuery}`,
      }))
      return {
        id: sampleId,
        title: voice.name,
        description,
        segments,
        language,
        languageVoice: encodedVoiceId,
        avatarSrc: getVoiceAvatar(encodedVoiceId),
        isAffiliateExclusive: true,
        affiliateExclusiveBadgeText: exclusiveBadgeText,
        attribution: script?.attribution,
      }
    })
  })

  const defaultSamples = computed<TTSSample[]>(() => {
    return [
      {
        id: 'cantonese-pazu',
        title: $t('tts_sample_cantonese_voice_name'),
        description: $t('tts_sample_cantonese'),
        segments: [
          '當我慢慢依食譜調配藥水時，望著餓了一整個月的陳生，我忍不住問：「等咗咁耐，又要捱痛，仲要咁耐一啲嘢都冇得食。其實有冇好辛苦呀？」',
          '「冇嘢食都事小呀，我想快啲出院就真！我想出院煎魚就真！」「你知唔知呀，我啲熟客仔都 WhatsApp 我話好掛住我啲餸呀！」',
          '「嗱，H 醫生，等我好返出院之後，你嚟我間舖，我請你食唔使錢！」陳生如此許諾。',
          '然後我才知道，陳生之所以忙得連睇醫生的時間也沒有，是因為他主理一間離島的海鮮餐廳，店面雖小，卻口碑一流，客人駱驛不絕。我讀著《飲食男女》的訪問，「陳記」（化名）其中一道著名小菜，正正是煎魚。',
          '一年之後，某個年假，我獨自到離島享受難得的假期。在落船的一刻，望著岸邊的舢舨漁船，聞著漁獲的海水鮮味伴隨鹹香飄過，我方才想起，這個小島上有一個我的老朋友。',
          '我翻閱一年前與同事的 WhatsApp message，找到「陳記茶餐廳」的地址。',
          '我想知道，陳生捱過有苦無言訴、無味可入口的日子後，今日的他是否安好，此刻是否仍然炒出一碟碟避風塘辣蟹、椒鹽鮮魷，讓每個過路旅客得以感受人生滋味。這一份盼望引領我來到茶餐廳。',
        ],
        language: 'zh-HK',
        voiceId: 'pazu',
      },
      {
        id: 'mandarin-aurora',
        title: $t('tts_sample_mandarin_voice_name'),
        description: $t('tts_sample_mandarin'),
        segments: [
          '她隨手從柴堆裡面抽出一根手指粗的棍子站起來，跨過熊熊的火堆衝到我面前，身子還沒停穩棍子就劈下來。',
          '張嬸他們上前扯，我媽兩手推開他們嚷道，今天你們誰也別攔著我，我就是要打死她，她這麼不聽話以後能有什麼用。',
          '我爸坐在火堆邊沒有作聲沒有起身，他是什麼表情，怎麼看我挨打的，我已不太記得了。',
          '我知道她會罵，但不知她會這樣打。我只記得她打了我很久，一邊打一邊罵。一根棍子打斷了，換第二根。直到我們都精疲力盡，她是累的，我是哭的。打完才讓我坐下來烤火，張嬸熱好飯菜端來。',
          '棉衣厚，上身沒打到什麼，下身只穿了一條毛褲，青痕第二天在腿上赫赫顯出來。',
          '老了的媽媽，像改變容顏一樣，她的記憶也變了，她說她這一輩子只打過我兩次。',
          '我問她是哪兩次，她說一次是我數學考五十多分，她氣得吐血打了我一次，一次是初中時我不聽話下大雨還拖著單車跑回家。',
          '我笑著說我又冷又餓跑那麼遠回家你還打，你真是。',
          '她說你不聽話我還不打？你犟得要死，那個天氣你回家，路上要有個什麼事呢，所以我要打，打得你聽話，這是最後一次打你，再以後就沒打過了。',
          '雖然她不記得打過我無數次，但這一次，確實是她最後一次打我，那年我十四歲。',
        ],
        language: 'zh-TW',
        voiceId: 'aurora',
      },
    ].map(({ voiceId, ...sample }) => {
      const languageVoice = `${sample.language}_${voiceId}`
      return {
        ...sample,
        segments: sample.segments.map((text, index) => ({
          id: `${sample.id}-segment-${index}`,
          text,
          sectionIndex: 0,
          cfi: undefined,
          audioSrc: `/tts-samples/${sample.id}/${index + 1}.mp3`,
        })),
        languageVoice,
        avatarSrc: getVoiceAvatar(languageVoice),
      }
    })
  })

  function buildSystemVoiceSample(voice: SystemVoice): TTSSample {
    const languageVoice = `${voice.language}_${voice.voiceId}`
    const sampleId = `system-${voice.voiceId}`
    const query = new URLSearchParams({
      voice_id: voice.voiceId,
      language: voice.language,
    }).toString()
    return {
      id: sampleId,
      title: voice.name,
      description: getSampleDescription(voice.language),
      segments: [{
        id: `${sampleId}-segment-0`,
        text: getTTSSampleText(voice.language),
        sectionIndex: 0,
        cfi: undefined,
        audioSrc: `/api/tts/sample?${query}`,
      }],
      language: voice.language,
      languageVoice,
      avatarSrc: getVoiceAvatar(languageVoice),
      // These are lent by a real person, and the modal sells them as proof that
      // a member can clone their own voice — so name the source of the clone.
      attribution: { text: $t('tts_sample_system_voice_credit', { name: voice.name }) },
    }
  }

  // A referrer who owns a built-in voice gets it surfaced alongside the
  // defaults, even without an affiliate config.
  const referrerSystemVoiceSamples = computed<TTSSample[]>(() => {
    const voice = getSystemVoiceByOwnerLikerId(toValue(affiliateLikerId))
    return voice ? [buildSystemVoiceSample(voice)] : []
  })

  const samples = computed<TTSSample[]>(() => [
    ...defaultSamples.value,
    ...referrerSystemVoiceSamples.value,
    ...affiliateSamples.value,
  ])

  // A referrer's own clone tells the better story, so the flagship is only a
  // fallback. Kept out of `samples` so it never doubles up in the grid.
  const flagshipCloneSample = computed<TTSSample | null>(() => {
    const referred = affiliateSamples.value[0] ?? referrerSystemVoiceSamples.value[0]
    if (referred) return referred
    const voice = getFlagshipSystemVoice(detectedCountry.value)
    return voice ? buildSystemVoiceSample(voice) : null
  })

  // Snapshotted on play rather than looked up by id: `flagshipCloneSample`
  // recomputes once affiliate voices arrive and lives outside `samples`, so a
  // live lookup could swap or lose the sample mid-playback.
  const activeSample = ref<TTSSample | null>(null)
  const activeSampleId = computed(() => activeSample.value?.id ?? null)
  const isPlaying = ref(false)
  const isLoading = ref(false)
  const currentSegmentIndex = ref(0)
  const segmentProgress = ref(0)

  const audio = ref<HTMLAudioElement | null>(null)
  let errorRetryTimer: ReturnType<typeof setTimeout> | undefined

  const segments = computed(() => activeSample.value?.segments ?? [])

  const charOffsets = computed(() => getTTSCharOffsets(segments.value))

  // Character-weighted and blended with the segment's playback time: segments
  // differ in length, and a one-segment system voice sample would otherwise
  // jump from 0 straight to 100. Rounded here: it crosses a prop on every tick.
  const progressPercentage = computed(() => {
    const offsets = charOffsets.value
    const total = offsets.at(-1) ?? 0
    if (!total) return 0
    const start = offsets[currentSegmentIndex.value] ?? 0
    const end = offsets[currentSegmentIndex.value + 1] ?? total
    return Math.round(Math.min(1, (start + (end - start) * segmentProgress.value) / total) * 100)
  })

  const currentSegment = computed(() => {
    return segments.value[currentSegmentIndex.value]
  })

  const currentSegmentText = computed(() => {
    return currentSegment.value?.text || ''
  })

  const longestSegmentText = computed(() => {
    return segments.value.reduce((longest, segment) => {
      return segment.text.length > longest.length ? segment.text : longest
    }, '')
  })

  function createAudio(segment: TTSSegment): HTMLAudioElement {
    resetAudio()

    const newAudio = new Audio()
    newAudio.src = segment.audioSrc || ''
    audio.value = newAudio
    isLoading.value = true
    segmentProgress.value = 0

    newAudio.onplay = () => {
      isPlaying.value = true
      // Resuming a stalled element re-buffers before it makes a sound, so keep
      // the spinner up rather than animating the wave bars over silence.
      isLoading.value = !getCanPlayNow(newAudio)
    }

    newAudio.onplaying = () => {
      isLoading.value = false
    }

    // A system voice sample synthesizes on a cache miss, so the first play can
    // stall for seconds with nothing else to show for it.
    newAudio.onwaiting = () => {
      isLoading.value = true
    }

    newAudio.onpause = () => {
      isPlaying.value = false
      // A `waiting` that never gets its matching `playing` would otherwise pin
      // the spinner up for good once the user pauses mid-buffer.
      isLoading.value = false
    }

    newAudio.ontimeupdate = () => {
      const { currentTime, duration } = newAudio
      if (getCanPlayNow(newAudio)) isLoading.value = false
      segmentProgress.value = Number.isFinite(duration) && duration > 0
        ? Math.min(1, currentTime / duration)
        : 0
    }

    newAudio.onended = () => {
      playNextSegment()
    }

    newAudio.onerror = (e) => {
      const error = newAudio.error || e
      isLoading.value = false
      onError?.(error)

      // Try to continue with next segment after error
      errorRetryTimer = setTimeout(() => {
        if (isPlaying.value) {
          playNextSegment()
        }
      }, 1000)
    }

    return newAudio
  }

  async function startAudio(element: HTMLAudioElement) {
    try {
      await element.play()
    }
    catch (error) {
      // A superseded segment rejects after the next one is already loading, so
      // its state writes would land on the element that replaced it.
      if (audio.value !== element) return
      // `play()` rejects when the browser blocks playback (iOS low power mode,
      // the native WebView). That is not worth an error modal: staying paused
      // leaves the play button ready to retry.
      isPlaying.value = false
      isLoading.value = false
      if (getIsAbortError(error)) return
      if (error instanceof DOMException && error.name === 'NotAllowedError') return
      onError?.(error)
    }
  }

  async function playCurrentSegment() {
    const segment = currentSegment.value
    if (!segment) return

    await startAudio(createAudio(segment))
  }

  function playNextSegment() {
    if (currentSegmentIndex.value + 1 >= segments.value.length) {
      // All segments played, complete playback
      onEnd?.()
      stop()
      return
    }

    currentSegmentIndex.value += 1
    playCurrentSegment()
  }

  function play(sampleId: string) {
    // Stop any currently playing audio
    stop()

    // Set active sample (this will automatically update segments via computed)
    activeSample.value = flagshipCloneSample.value?.id === sampleId
      ? flagshipCloneSample.value
      : samples.value.find(sample => sample.id === sampleId) ?? null
    // Set up new playback
    currentSegmentIndex.value = 0
    playCurrentSegment()

    return activeSample.value
  }

  // Pausing keeps the sample loaded: one caller derives the modal's open state
  // from `activeSample`, so pausing through `stop()` would close the modal.
  function pause() {
    audio.value?.pause()
  }

  function resume() {
    if (!activeSample.value) return
    const element = audio.value
    // A failed element stays attached so the error handler can advance past it;
    // replaying it only re-rejects, so rebuild the segment instead.
    if (element && !element.error) {
      startAudio(element)
      return
    }
    playCurrentSegment()
  }

  // Returns the action taken so the caller can log it, as `play` does.
  function togglePlayback(): TTSSampleAction {
    if (isPlaying.value) {
      pause()
      return 'pause'
    }
    resume()
    return 'resume'
  }

  function resetAudio() {
    clearTimeout(errorRetryTimer)
    const element = audio.value
    if (!element) return
    audio.value = null
    // Detached before pausing: `pause()` and `load()` queue events that would
    // otherwise land on the handlers of an element we have already discarded.
    element.onplay = null
    element.onplaying = null
    element.onwaiting = null
    element.onpause = null
    element.ontimeupdate = null
    element.onended = null
    element.onerror = null
    element.pause()
    element.src = ''
    element.load()
    isLoading.value = false
  }

  function stop() {
    resetAudio()

    // Reset all state
    isPlaying.value = false
    activeSample.value = null
    currentSegmentIndex.value = 0
    segmentProgress.value = 0
  }

  onUnmounted(() => {
    stop()
  })

  return {
    samples,
    flagshipCloneSample,

    // Not `readonly()`: that deep-freezes the sample and stops it satisfying
    // the `TTSSample` props it gets bound to.
    activeSample: computed(() => activeSample.value),
    activeSampleId,
    isPlaying: readonly(isPlaying),
    isLoading: readonly(isLoading),
    progressPercentage,
    currentSegmentIndex: readonly(currentSegmentIndex),
    currentSegmentText: readonly(currentSegmentText),
    longestSegmentText: readonly(longestSegmentText),

    play,
    stop,
    togglePlayback,
  }
}
