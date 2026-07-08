import type { Writable } from 'node:stream'
import type { H3Event } from 'h3'
import type { AffiliateCustomVoice } from '~~/server/types/affiliate'
import { TTSQuerySchema } from '~~/server/schemas/tts'
import { computeLegacyTTSTextSig, computeTTSTextSig, decodeAffiliateVoiceId, isAffiliateVoiceId, TTS_PREVIEW_NFT_CLASS_ID } from '~~/shared/utils/tts-sig'
import { buildTTSServerTiming, TTS_SERVER_SOURCE, type TTSServerSource } from '~~/shared/utils/tts-server-timing'

// Coalesces concurrent identical TTS requests (e.g. browser range probes)
const inFlightWrites = new Map<string, Promise<void>>()
const IN_FLIGHT_TIMEOUT_MS = 120_000

// Per-request source marker, read back client-side via
// PerformanceResourceTiming.serverTiming on the tts_segment_loaded event to
// size Cloud Storage cache hits vs expensive Minimax generations.
function setTTSSourceHeader(event: H3Event, source: TTSServerSource) {
  setHeader(event, 'server-timing', buildTTSServerTiming(source))
}

function getTTSProvider(voiceId: string): MinimaxTTSProvider {
  if (!KNOWN_VOICE_IDS.has(voiceId)) {
    throw createError({
      status: 400,
      message: 'INVALID_VOICE_ID',
    })
  }
  return new MinimaxTTSProvider()
}

async function serveCachedTTS(
  event: H3Event,
  bucket: NonNullable<ReturnType<typeof getTTSCacheBucket>>,
  cacheKey: string,
  contentFormat: string,
  wallet: string,
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
    // Auto-burst stale audio when the pronunciation dictionary changes.
    const meta = metadata[0].metadata ?? {}
    if (isCachedTTSPronunciationStale({ file, meta, dictVersion, getExpectedSig, cacheKey, label: `user ${wallet}` })) {
      return null
    }
  }
  catch (error: unknown) {
    if ((error as { code?: number })?.code === 404) return null
    throw error
  }
  const rangeHeader = getHeader(event, 'range')

  const etag = computeShortETag(cacheKey)
  setHeader(event, 'content-type', contentType)
  setHeader(event, 'cache-control', 'public, max-age=604800')
  setHeader(event, 'accept-ranges', 'bytes')
  setHeader(event, 'vary', 'Range')
  setHeader(event, 'etag', etag)
  setTTSSourceHeader(event, TTS_SERVER_SOURCE.STORED)

  console.log(`[Speech] Cache hit for user ${wallet}: ${cacheKey}`)

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
  const session = await requireUserSession(event)
  const config = useRuntimeConfig()
  const {
    text,
    language,
    voice_id: voiceId,
    blocking,
    nft_class_id: nftClassId,
    sig,
  } = await getValidatedQuery(event, createValidator(TTSQuerySchema))

  const isCustomVoice = voiceId === 'custom'
  const isAffiliateVoice = isAffiliateVoiceId(voiceId)
  const isPrivateVoice = isCustomVoice || isAffiliateVoice
  const isPreviewClassId = nftClassId === TTS_PREVIEW_NFT_CLASS_ID

  // System and affiliate voices rely on book-level gating for per-book quota
  // accounting; the preview class id bypasses that, so it's restricted to the
  // user's own cloned voice.
  if (isPreviewClassId && !isCustomVoice) {
    throw createError({ status: 403, message: 'PREVIEW_REQUIRES_CUSTOM_VOICE' })
  }

  const ttsEventBase = {
    evmWallet: session.user.evmWallet,
    language,
    voiceId,
    isCustomVoice,
    isAffiliateVoice,
    textLength: text.length,
    nftClassId,
  }

  // Verify text signature — binds the request to voice + language + book +
  // exact text. System voices use an empty token so URLs converge across
  // users and can be shared-cached at Cloudflare. Private voices (custom +
  // affiliate) additionally bind to the user via ttsKey, keeping URLs unique
  // per wallet so the edge cache cannot serve one user's cloned/exclusive
  // voice audio to another. Sig check always runs regardless of whether
  // ttsKey is present, so legacy sessions without a key can't be
  // fingerprinted by response shape.
  const sigToken = isPrivateVoice ? (session.user.ttsKey ?? '') : ''
  let sigOk = sig === computeTTSTextSig({ token: sigToken, voiceId, language, nftClassId, text })

  if (!sigOk && session.user.ttsKey) {
    // Transitional: accept pre-voice/language-binding sig shape so stale
    // clients (PWA cache, long-lived tabs) keep working until they reload.
    // Only honored on sessions with ttsKey — legacy clients that fell back
    // to evmWallet remain rejected so the wallet-derivable-sig gap stays
    // closed. Remove once `TTSLegacySig` event volume flatlines.
    if (sig === computeLegacyTTSTextSig(session.user.ttsKey, nftClassId, text)) {
      sigOk = true
      publishEvent(event, 'TTSLegacySig', ttsEventBase)
    }
  }

  if (!sigOk) {
    throw createError({ status: 403, message: 'INVALID_TTS_SIG' })
  }

  // Private voices require a secret per-user token so sigs are unforgeable
  // even for an attacker who knows the public wallet. Legacy sessions that
  // pre-date ttsKey must re-login before private voices will work.
  if (isPrivateVoice && !session.user.ttsKey) {
    throw createError({ status: 403, message: 'MISSING_TTS_KEY' })
  }

  const affiliateVoiceSlot = isAffiliateVoice ? decodeAffiliateVoiceId(voiceId) : undefined
  let customMiniMaxVoiceId: string | undefined
  let voiceDisplayName: string | undefined
  let provider: BaseTTSProvider

  if (isAffiliateVoice) {
    const isLikerPlus = session.user.isLikerPlus || false
    if (!isLikerPlus) {
      throw createError({ status: 402, message: 'REQUIRE_LIKER_PLUS' })
    }
    if (!affiliateVoiceSlot) {
      throw createError({ status: 400, message: 'INVALID_AFFILIATE_VOICE' })
    }
    // Resolve across every source the user may use — their own publisher voices
    // and the affiliate they were referred by. Ownership is gated at the
    // reader-page level; the scope check is a sanity boundary to stop an
    // arbitrary book from riding an affiliate voice URL.
    const sources = await getUserAffiliateSources(session.user)
    // Resolve the requested slot in each source, then keep only those whose config
    // scopes this book. Voice ids are globally unique across affiliates, so at most
    // one source should own a slot for a given book.
    const slotMatches = sources.flatMap((source) => {
      const voice = source.config.customVoices.find(v => v.id === affiliateVoiceSlot)
      return voice?.providerVoiceId ? [{ source, voice }] : []
    })
    const inScopeVoices: AffiliateCustomVoice[] = []
    for (const { source, voice } of slotMatches) {
      if (await isBookInAffiliateVoiceScope(source.config, nftClassId)) {
        inScopeVoices.push(voice)
      }
    }
    // Fail loud only when the in-scope sources disagree on the provider voice — an
    // out-of-scope duplicate slot must not block a voice that legitimately scopes
    // this book. Uniqueness should hold upstream, so this guards a broken invariant.
    if (new Set(inScopeVoices.map(voice => voice.providerVoiceId)).size > 1) {
      throw createError({ status: 409, message: 'AFFILIATE_VOICE_AMBIGUOUS' })
    }
    const matchedVoice = inScopeVoices[0]
    if (!matchedVoice) {
      // A slot match that survived nowhere means the book is out of scope; no slot
      // match at all means the voice id is unknown to this user's sources.
      throw createError(slotMatches.length
        ? { status: 403, message: 'BOOK_NOT_IN_AFFILIATE' }
        : { status: 404, message: 'AFFILIATE_VOICE_NOT_FOUND' })
    }
    customMiniMaxVoiceId = matchedVoice.providerVoiceId
    voiceDisplayName = matchedVoice.name
    provider = new MinimaxTTSProvider()
  }
  else if (isCustomVoice) {
    const isLikerPlus = session.user.isLikerPlus || false
    if (!isLikerPlus) {
      throw createError({ status: 402, message: 'REQUIRE_LIKER_PLUS' })
    }
    const customVoice = await getCustomVoice(session.user.evmWallet)
    if (!customVoice?.voiceId) {
      throw createError({ status: 404, message: 'NO_CUSTOM_VOICE' })
    }
    customMiniMaxVoiceId = customVoice.voiceId
    voiceDisplayName = customVoice.voiceName
    provider = new MinimaxTTSProvider()
  }
  else {
    voiceDisplayName = getVoiceDisplayName(voiceId)
    provider = getTTSProvider(voiceId)
  }

  const logText = text.replace(/(\r\n|\n|\r)/gm, ' ')
  console.log(`[Speech] User ${session.user.evmWallet} requested conversion. Language: ${language}, Text: "${logText.substring(0, 50)}${logText.length > 50 ? '...' : ''}", Voice: ${voiceId}${customMiniMaxVoiceId ? ` (${customMiniMaxVoiceId})` : ''}`)

  if (!await getUserTTSAvailable(event)) {
    throw createError({
      status: 402,
      message: 'REQUIRE_LIKER_PLUS',
    })
  }

  const ttsModel = getMinimaxModel({ voiceId, customVoiceId: customMiniMaxVoiceId, language })
  // Dictionary version + per-text applicable-rules signature drive cache
  // invalidation, stamped on write and compared on read so a pronunciation edit
  // auto-bursts exactly the affected segments. The version is a cheap stamp; the
  // signature (a ~6k-entry scan for zh-TW) is computed lazily — only on a cache
  // miss or the version-mismatch check after an edit — so steady-state hits
  // never pay for it. Built from the synthesized text the provider sends.
  const dictVersion = TTS_PRONUNCIATION_VERSION[language] ?? 'none'
  const getExpectedSig = createTTSPronunciationSigGetter(language, text)
  const bucket = getTTSCacheBucket()
  const isCacheEnabled = !!bucket
  // Custom and affiliate voices carry their Minimax id directly; system voices
  // resolve theirs from the internal alias.
  const minimaxVoiceId = customMiniMaxVoiceId ?? getMinimaxVoiceId(voiceId)
  const cacheKey = isCacheEnabled && minimaxVoiceId
    ? generateTTSCacheKey(minimaxVoiceId, language, text, ttsModel)
    : null

  if (isCacheEnabled && cacheKey) {
    try {
      const result = await serveCachedTTS(event, bucket, cacheKey, provider.format, session.user.evmWallet, dictVersion, getExpectedSig)
      if (result !== null) {
        publishEvent(event, 'TTSCacheHit', ttsEventBase)
        return result
      }
    }
    catch (error) {
      console.warn(`[Speech] Cache check failed for user ${session.user.evmWallet}:`, error)
    }
  }

  let resolveInFlight: (() => void) | undefined
  let rejectInFlight: ((error: unknown) => void) | undefined
  if (cacheKey) {
    const pending = inFlightWrites.get(cacheKey)
    if (pending) {
      console.log(`[Speech] In-flight dedup for user ${session.user.evmWallet}: ${cacheKey}`)
      try {
        await pending
        const result = await serveCachedTTS(event, bucket!, cacheKey, provider.format, session.user.evmWallet, dictVersion, getExpectedSig)
        if (result !== null) return result
        console.warn(`[Speech] In-flight dedup cache miss after wait, generating own for user ${session.user.evmWallet}: ${cacheKey}`)
      }
      catch {
        console.warn(`[Speech] In-flight request failed, generating own for user ${session.user.evmWallet}`)
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
      inFlightWrites.delete(cacheKey!)
    })
  }

  const id3Tag = buildID3v2Tag({
    title: '3ook.com TTS',
    artist: voiceDisplayName,
    comment: 'Generated by 3ook.com',
  })

  await updateUserTTSCharacterUsage(session.user.evmWallet, text.length)

  publishEvent(event, 'TTSRequest', ttsEventBase)

  if (nftClassId && !isPreviewClassId) {
    incrementBookTTSCharacterUsage(session.user.evmWallet, nftClassId, text.length)
      .catch(err => console.warn('[TTS] Failed to increment per-book TTS usage:', err))
  }

  const isBlocking = blocking === '1'
  const requestParams: TTSRequestParams = {
    text,
    language,
    voiceId,
    customMiniMaxVoiceId,
    session,
    config,
  }

  const cacheMetadata = {
    contentType: provider.format,
    cacheControl: 'public, max-age=604800',
    metadata: {
      language,
      voiceId,
      provider: provider.provider,
      nftClassId,
      text: text.length > 1800 ? text.substring(0, 1800) + '...' : text,
      textLength: text.length.toString(),
      pronunciationVersion: dictVersion,
      pronunciationSig: getExpectedSig(),
      createdAt: new Date().toISOString(),
    },
  }

  try {
    if (isBlocking) {
      // Blocking path: full buffer with content-length (needed by native app)
      const { audio: rawBuffer, extraInfo, traceId } = await provider.processRequest(requestParams)
      const buffer = Buffer.concat([id3Tag, rawBuffer])

      const etag = computeShortETag(cacheKey ?? buffer)
      setHeader(event, 'content-type', provider.format)
      setHeader(event, 'cache-control', 'public, max-age=604800')
      setHeader(event, 'accept-ranges', 'bytes')
      setHeader(event, 'vary', 'Range')
      setHeader(event, 'etag', etag)
      setTTSSourceHeader(event, TTS_SERVER_SOURCE.GENERATED)

      if (isCacheEnabled) {
        const cacheFile = bucket.file(cacheKey!)
        cacheFile.save(buffer, { metadata: cacheMetadata })
          .then(() => resolveInFlight?.())
          .catch((error: unknown) => {
            console.warn(`[Speech] Cache write failed for user ${session.user.evmWallet}:`, error)
            rejectInFlight?.(error)
          })
      }
      else {
        resolveInFlight?.()
      }

      publishEvent(event, 'TTSComplete', { ...ttsEventBase, audioSize: buffer.length, mode: 'blocking', ...getTTSExtraInfoEventProps(extraInfo, traceId) })

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
    }

    // Streaming path (default): pipe audio chunks as they arrive
    const { audio: stream, extraInfo: extraInfoPromise, traceId: traceIdPromise } = await provider.processRequestStream(requestParams)

    if (cacheKey) {
      setHeader(event, 'etag', computeShortETag(cacheKey))
    }
    setHeader(event, 'content-type', provider.format)
    setHeader(event, 'cache-control', 'public, max-age=604800')
    setTTSSourceHeader(event, TTS_SERVER_SOURCE.GENERATED)

    let cacheWriteStream: Writable | null = null
    if (isCacheEnabled) {
      const cacheFile = bucket.file(cacheKey!)
      cacheWriteStream = cacheFile.createWriteStream({ metadata: cacheMetadata })
      cacheWriteStream.on('finish', () => resolveInFlight?.())
      cacheWriteStream.on('error', (error: unknown) => {
        console.warn(`[Speech] Cache write failed for user ${session.user.evmWallet}:`, error)
        rejectInFlight?.(error)
        if (cacheWriteStream) {
          if (!cacheWriteStream.writableEnded) {
            cacheWriteStream.destroy()
          }
          cacheWriteStream = null
          bucket!.file(cacheKey!).delete({ ignoreNotFound: true }).catch(() => {})
        }
      })
    }

    // Clean up incomplete cache object if client disconnects mid-stream
    event.node.req.on('close', () => {
      if (cacheWriteStream && !cacheWriteStream.writableEnded) {
        cacheWriteStream.destroy()
        cacheWriteStream = null
        rejectInFlight?.(new Error('Client disconnected'))
        bucket!.file(cacheKey!).delete({ ignoreNotFound: true }).catch(() => {})
      }
    })

    let streamedBytes = 0
    const cacheStream = new TransformStream<Buffer, Buffer>({
      start(controller) {
        controller.enqueue(id3Tag)
        streamedBytes += id3Tag.length
        cacheWriteStream?.write(id3Tag)
      },
      async transform(chunk, controller) {
        streamedBytes += chunk.length
        if (cacheWriteStream) {
          const canContinue = cacheWriteStream.write(chunk)
          if (!canContinue) {
            await new Promise<void>(resolve => cacheWriteStream!.once('drain', resolve))
          }
        }
        controller.enqueue(chunk)
      },
      async flush() {
        cacheWriteStream?.end()
        // Safe to await here: flush() runs only after the source SSE stream is
        // fully drained, so these resolve from the just-consumed final chunk —
        // settled or imminent, never a hang, and never reject (they resolve
        // undefined on early/aborted streams, where flush() isn't reached).
        const [extraInfo, traceId] = await Promise.all([extraInfoPromise, traceIdPromise])
        publishEvent(event, 'TTSComplete', { ...ttsEventBase, audioSize: streamedBytes, mode: 'streaming', ...getTTSExtraInfoEventProps(extraInfo, traceId) })
      },
    })

    return await sendStream(event, stream.pipeThrough(cacheStream))
  }
  catch (error) {
    rejectInFlight?.(error)
    publishEvent(event, 'TTSError', { ...ttsEventBase, error: error instanceof Error ? error.message : String(error) })
    console.error(`[Speech] Failed to convert text for user ${session.user.evmWallet}:`, error)
    throw error
  }
})
