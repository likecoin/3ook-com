import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { TTSSampleQuerySchema } from '~~/server/schemas/tts'
import { decodeAffiliateVoiceId, isAffiliateVoiceId } from '~~/shared/utils/tts-sig'
import { getAffiliateSampleScript, getTTSSampleText } from '~~/shared/utils/tts-sample'

// Public endpoint with deterministic URLs, so a cold cache can produce a
// thundering herd of identical Minimax synthesis requests. The map collapses
// concurrent identical requests to one synthesis + cache write.
const inFlightWrites = new Map<string, Promise<void>>()
const IN_FLIGHT_TIMEOUT_MS = 120_000

async function serveCachedSample(
  event: H3Event,
  bucket: NonNullable<ReturnType<typeof getTTSCacheBucket>>,
  cacheKey: string,
  contentFormat: string,
  dictVersion: string,
  getExpectedSig: () => string,
): Promise<unknown | null> {
  const file = bucket.file(cacheKey)
  let totalSize: number
  let contentType: string
  try {
    const metadata = await file.getMetadata()
    totalSize = Number(metadata[0].size)
    contentType = metadata[0].contentType || contentFormat
    // Auto-burst stale sample audio when the pronunciation dictionary changes.
    const meta = metadata[0].metadata ?? {}
    if (isCachedTTSPronunciationStale({ file, meta, dictVersion, getExpectedSig, cacheKey, label: 'sample' })) {
      return null
    }
  }
  catch (error: unknown) {
    if ((error as { code?: number })?.code === 404) return null
    throw error
  }

  const etag = `"${createHash('sha256').update(cacheKey).digest('hex').substring(0, 16)}"`
  setHeader(event, 'content-type', contentType)
  setHeader(event, 'cache-control', 'public, max-age=604800')
  setHeader(event, 'accept-ranges', 'bytes')
  setHeader(event, 'vary', 'Range')
  setHeader(event, 'etag', etag)

  const rangeHeader = getHeader(event, 'range')
  if (rangeHeader && totalSize) {
    const range = parseRangeHeader(rangeHeader, totalSize)
    if (range) {
      const { start, end } = range
      setResponseStatus(event, 206)
      setHeader(event, 'content-range', `bytes ${start}-${end}/${totalSize}`)
      setHeader(event, 'content-length', end - start + 1)
      return sendStream(event, file.createReadStream({ start, end }))
    }
  }

  if (totalSize) {
    setHeader(event, 'content-length', totalSize)
  }
  return sendStream(event, file.createReadStream())
}

export default defineEventHandler(async (event) => {
  const { language: requestedLanguage, voice_id: voiceId, from, seg } = await getValidatedQuery(
    event,
    createValidator(TTSSampleQuerySchema),
  )

  const isAffiliate = isAffiliateVoiceId(voiceId)

  let customMiniMaxVoiceId: string | undefined
  let voiceDisplayName: string | undefined
  let language = requestedLanguage
  let text: string | undefined

  if (isAffiliate) {
    if (!from) {
      throw createError({ status: 400, message: 'MISSING_AFFILIATE_FROM' })
    }
    const slot = decodeAffiliateVoiceId(voiceId)
    if (!slot) {
      throw createError({ status: 400, message: 'INVALID_AFFILIATE_VOICE' })
    }
    const affiliateConfig = await getAffiliateConfig(from)
    if (!affiliateConfig?.active) {
      throw createError({ status: 403, message: 'AFFILIATE_INACTIVE' })
    }
    const affiliateVoice = affiliateConfig.customVoices.find(v => v.id === slot)
    if (!affiliateVoice?.providerVoiceId) {
      throw createError({ status: 404, message: 'AFFILIATE_VOICE_NOT_FOUND' })
    }
    customMiniMaxVoiceId = affiliateVoice.providerVoiceId
    voiceDisplayName = affiliateVoice.name

    const script = getAffiliateSampleScript(from, slot)
    if (script) {
      const segmentIndex = seg ?? 0
      const segmentText = script.segments[segmentIndex]
      if (!segmentText) {
        throw createError({ status: 400, message: 'INVALID_SEG' })
      }
      language = script.language
      text = segmentText
    }
    else if (seg !== undefined) {
      throw createError({ status: 400, message: 'INVALID_SEG' })
    }
  }
  else {
    if (!KNOWN_VOICE_IDS.has(voiceId)) {
      throw createError({ status: 400, message: 'INVALID_VOICE_ID' })
    }
    if (seg !== undefined) {
      throw createError({ status: 400, message: 'INVALID_SEG' })
    }
    voiceDisplayName = getVoiceDisplayName(voiceId)
  }

  text ??= getTTSSampleText(language)

  const provider = new MinimaxTTSProvider()
  const ttsModel = getMinimaxModel({ voiceId, customVoiceId: customMiniMaxVoiceId, language })
  // Stamp + check the pronunciation dictionary version so a dict edit
  // auto-bursts affected sample audio, mirroring the reader endpoint. The
  // signature is computed lazily (only on cache miss or version mismatch) from
  // the synthesized text the provider sends.
  const dictVersion = TTS_PRONUNCIATION_VERSION[language] ?? 'none'
  const getExpectedSig = createTTSPronunciationSigGetter(language, text)
  const bucket = getTTSCacheBucket()
  const isCacheEnabled = !!bucket
  const cacheKey = isCacheEnabled
    ? (isAffiliate && customMiniMaxVoiceId
        ? generateAffiliateVoiceTTSCacheKey(customMiniMaxVoiceId, language, text, ttsModel)
        : generateTTSCacheKey(language, voiceId, text, ttsModel))
    : null

  if (isCacheEnabled && cacheKey) {
    try {
      const result = await serveCachedSample(event, bucket, cacheKey, provider.format, dictVersion, getExpectedSig)
      if (result !== null) return result
    }
    catch (error) {
      console.warn('[Speech] Sample cache check failed:', error)
    }
  }

  let resolveInFlight: (() => void) | undefined
  let rejectInFlight: ((error: unknown) => void) | undefined
  if (cacheKey) {
    const pending = inFlightWrites.get(cacheKey)
    if (pending) {
      try {
        await pending
        const result = await serveCachedSample(event, bucket!, cacheKey, provider.format, dictVersion, getExpectedSig)
        if (result !== null) return result
      }
      catch {
        console.warn('[Speech] Sample in-flight wait failed, generating own')
      }
    }

    const inFlightPromise = new Promise<void>((resolve, reject) => {
      resolveInFlight = resolve
      rejectInFlight = reject
    })
    inFlightPromise.catch(() => {})
    inFlightWrites.set(cacheKey, inFlightPromise)
    const timeoutId = setTimeout(() => {
      rejectInFlight?.(new Error('In-flight timeout'))
    }, IN_FLIGHT_TIMEOUT_MS)
    inFlightPromise.finally(() => {
      clearTimeout(timeoutId)
      inFlightWrites.delete(cacheKey)
    })
  }

  const id3Tag = buildID3v2Tag({
    title: '3ook.com TTS Sample',
    artist: voiceDisplayName,
    comment: 'Generated by 3ook.com',
  })

  let buffer: Buffer
  try {
    const { audio: rawBuffer } = await provider.processRequest({
      text,
      language,
      voiceId,
      customMiniMaxVoiceId,
    })
    buffer = Buffer.concat([id3Tag, rawBuffer])
  }
  catch (error) {
    rejectInFlight?.(error)
    throw error
  }

  const etag = cacheKey
    ? `"${createHash('sha256').update(cacheKey).digest('hex').substring(0, 16)}"`
    : `"${createHash('sha256').update(buffer).digest('hex').substring(0, 16)}"`
  setHeader(event, 'content-type', provider.format)
  setHeader(event, 'cache-control', 'public, max-age=604800')
  setHeader(event, 'accept-ranges', 'bytes')
  setHeader(event, 'vary', 'Range')
  setHeader(event, 'etag', etag)

  if (isCacheEnabled && cacheKey) {
    bucket!.file(cacheKey).save(buffer, {
      metadata: {
        contentType: provider.format,
        cacheControl: 'public, max-age=604800',
        metadata: {
          language,
          voiceId,
          provider: provider.provider,
          text,
          textLength: text.length.toString(),
          isSample: 'true',
          pronunciationVersion: dictVersion,
          pronunciationSig: getExpectedSig(),
          createdAt: new Date().toISOString(),
        },
      },
    })
      .then(() => resolveInFlight?.())
      .catch((error: unknown) => {
        console.warn('[Speech] Sample cache write failed:', error)
        rejectInFlight?.(error)
      })
  }
  else {
    resolveInFlight?.()
  }

  const rangeHeader = getHeader(event, 'range')
  if (rangeHeader) {
    const range = parseRangeHeader(rangeHeader, buffer.length)
    if (range) {
      const { start, end } = range
      setResponseStatus(event, 206)
      setHeader(event, 'content-range', `bytes ${start}-${end}/${buffer.length}`)
      setHeader(event, 'content-length', end - start + 1)
      return buffer.subarray(start, end + 1)
    }
  }

  setHeader(event, 'content-length', buffer.length)
  return buffer
})
