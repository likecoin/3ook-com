import { createHash } from 'node:crypto'
import type { Writable } from 'node:stream'
import type { H3Event } from 'h3'
import { TTSQuerySchema } from '~/server/schemas/tts'
import { computeLegacyTTSTextSig, computeTTSTextSig, decodeAffiliateVoiceId, isAffiliateVoiceId } from '~/shared/utils/tts-sig'

// Coalesces concurrent identical TTS requests (e.g. browser range probes)
const inFlightWrites = new Map<string, Promise<void>>()
const IN_FLIGHT_TIMEOUT_MS = 120_000

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
): Promise<unknown | null> {
  const file = bucket.file(cacheKey)
  let totalSize: number
  let contentType: string
  try {
    const metadata = await file.getMetadata()
    totalSize = Number(metadata[0].size)
    contentType = metadata[0].contentType || contentFormat
  }
  catch (error: unknown) {
    if ((error as { code?: number })?.code === 404) return null
    throw error
  }
  const rangeHeader = getHeader(event, 'range')

  const etag = `"${createHash('sha256').update(cacheKey).digest('hex').substring(0, 16)}"`
  setHeader(event, 'content-type', contentType)
  setHeader(event, 'cache-control', 'public, max-age=604800')
  setHeader(event, 'accept-ranges', 'bytes')
  setHeader(event, 'vary', 'Range')
  setHeader(event, 'etag', etag)

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
  if (!session) {
    throw createError({
      status: 401,
      message: 'UNAUTHORIZED',
    })
  }
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
    const plusAffiliateFrom = session.user.plusAffiliateFrom
    if (!plusAffiliateFrom) {
      throw createError({ status: 403, message: 'NO_PLUS_AFFILIATE' })
    }
    if (!affiliateVoiceSlot) {
      throw createError({ status: 400, message: 'INVALID_AFFILIATE_VOICE' })
    }
    const affiliateConfig = await getAffiliateConfig(plusAffiliateFrom)
    if (!affiliateConfig?.active) {
      throw createError({ status: 403, message: 'AFFILIATE_INACTIVE' })
    }
    // Ownership is gated at the reader-page level; this check is a sanity
    // boundary to stop an arbitrary book from riding an affiliate voice URL.
    if (!isBookInAffiliateVoiceScope(affiliateConfig, nftClassId)) {
      throw createError({ status: 403, message: 'BOOK_NOT_IN_AFFILIATE' })
    }
    const affiliateVoice = affiliateConfig.customVoices.find(v => v.id === affiliateVoiceSlot)
    if (!affiliateVoice?.providerVoiceId) {
      throw createError({ status: 404, message: 'AFFILIATE_VOICE_NOT_FOUND' })
    }
    customMiniMaxVoiceId = affiliateVoice.providerVoiceId
    voiceDisplayName = affiliateVoice.name
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

  const customVoiceWallet = isCustomVoice ? session.user.evmWallet : undefined
  const logText = text.replace(/(\r\n|\n|\r)/gm, ' ')
  console.log(`[Speech] User ${session.user.evmWallet} requested conversion. Language: ${language}, Text: "${logText.substring(0, 50)}${logText.length > 50 ? '...' : ''}", Voice: ${voiceId}${customMiniMaxVoiceId ? ` (${customMiniMaxVoiceId})` : ''}`)

  if (!await getUserTTSAvailable(event)) {
    throw createError({
      status: 402,
      message: 'REQUIRE_LIKER_PLUS',
    })
  }

  const ttsModel = getMinimaxModel({ voiceId, customVoiceId: customMiniMaxVoiceId, language })
  const bucket = getTTSCacheBucket()
  const isCacheEnabled = !!bucket
  const cacheKey = isCacheEnabled
    ? (isAffiliateVoice && customMiniMaxVoiceId
        ? generateAffiliateVoiceTTSCacheKey(customMiniMaxVoiceId, language, text, ttsModel)
        : customVoiceWallet
          ? generateCustomVoiceTTSCacheKey(customVoiceWallet, language, text, ttsModel)
          : generateTTSCacheKey(language, voiceId, text, ttsModel))
    : null

  if (isCacheEnabled) {
    try {
      const result = await serveCachedTTS(event, bucket, cacheKey!, provider.format, session.user.evmWallet)
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
        const result = await serveCachedTTS(event, bucket!, cacheKey, provider.format, session.user.evmWallet)
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

  if (nftClassId) {
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
      text: text.length > 1800 ? text.substring(0, 1800) + '...' : text,
      textLength: text.length.toString(),
      createdAt: new Date().toISOString(),
    },
  }

  try {
    if (isBlocking) {
      // Blocking path: full buffer with content-length (needed by native app)
      const rawBuffer = await provider.processRequest(requestParams)
      const buffer = Buffer.concat([id3Tag, rawBuffer])

      const etag = cacheKey
        ? `"${createHash('sha256').update(cacheKey).digest('hex').substring(0, 16)}"`
        : `"${createHash('sha256').update(buffer).digest('hex').substring(0, 16)}"`
      setHeader(event, 'content-type', provider.format)
      setHeader(event, 'cache-control', 'public, max-age=604800')
      setHeader(event, 'accept-ranges', 'bytes')
      setHeader(event, 'vary', 'Range')
      setHeader(event, 'etag', etag)

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

      publishEvent(event, 'TTSComplete', { ...ttsEventBase, audioSize: buffer.length, mode: 'blocking' })

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
    const stream = await provider.processRequestStream(requestParams)

    if (cacheKey) {
      const etag = `"${createHash('sha256').update(cacheKey).digest('hex').substring(0, 16)}"`
      setHeader(event, 'etag', etag)
    }
    setHeader(event, 'content-type', provider.format)
    setHeader(event, 'cache-control', 'public, max-age=604800')

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
      flush() {
        cacheWriteStream?.end()
        publishEvent(event, 'TTSComplete', { ...ttsEventBase, audioSize: streamedBytes, mode: 'streaming' })
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
