interface TTSSamplesPlayerOptions {
  onError?: (error: unknown) => void
  onEnd?: (sampleId: string | null) => void
}

export function useTTSSamplesPlayer(options: TTSSamplesPlayerOptions = {}) {
  const { onError, onEnd } = options
  const { t: $t } = useI18n()
  const { getVoiceAvatar } = useTTSVoice()

  const samples = computed<TTSSample[]>(() =>
    [
      {
        id: 'cantonese-pazu',
        title: $t('tts_sample_cantonese'),
        description: $t('tts_sample_cantonese_description'),
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
        title: $t('tts_sample_mandarin'),
        description: $t('tts_sample_mandarin_description'),
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
    }),
  )

  const activeSampleId = ref<string | null>(null)
  const isPlaying = ref(false)
  const currentSegmentIndex = ref(0)

  const audio = ref<HTMLAudioElement | null>(null)

  const segments = computed(() => {
    if (!activeSampleId.value) return []
    const activeSample = samples.value.find(
      sample => sample.id === activeSampleId.value,
    )
    return activeSample?.segments || []
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

    newAudio.onplay = () => {
      isPlaying.value = true
    }

    newAudio.onended = () => {
      playNextSegment()
    }

    newAudio.onerror = (e) => {
      const error = newAudio.error || e
      onError?.(error)

      // Try to continue with next segment after error
      setTimeout(() => {
        if (isPlaying.value) {
          playNextSegment()
        }
      }, 1000)
    }

    return newAudio
  }

  async function playCurrentSegment() {
    const segment = currentSegment.value
    if (!segment) return

    const newAudio = createAudio(segment)
    await newAudio.play()
  }

  function playNextSegment() {
    if (currentSegmentIndex.value + 1 >= segments.value.length) {
      // All segments played, complete playback
      onEnd?.(activeSampleId.value)
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
    activeSampleId.value = sampleId
    // Set up new playback
    currentSegmentIndex.value = 0
    playCurrentSegment()
  }

  function resetAudio() {
    if (!audio.value) return
    audio.value.pause()
    audio.value.src = ''
    audio.value.load()
    audio.value.onplay = null
    audio.value.onended = null
    audio.value.onerror = null
    audio.value = null
  }

  function stop() {
    resetAudio()

    // Reset all state
    isPlaying.value = false
    activeSampleId.value = null
    currentSegmentIndex.value = 0
  }

  onUnmounted(() => {
    stop()
  })

  return {
    samples: readonly(samples),

    activeSampleId: readonly(activeSampleId),
    isPlaying: readonly(isPlaying),
    currentSegmentIndex: readonly(currentSegmentIndex),
    currentSegmentText: readonly(currentSegmentText),
    longestSegmentText: readonly(longestSegmentText),

    play,
    stop,
  }
}
