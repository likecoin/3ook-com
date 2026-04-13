import { createHash } from 'node:crypto'
import type { Writable } from 'node:stream'
import type { H3Event } from 'h3'
import { TTSQuerySchema } from '~/server/schemas/tts'
import { computeTTSTextSig } from '~/shared/utils/tts-sig'

// Coalesces concurrent identical TTS requests (e.g. browser range probes)
const inFlightWrites = new Map<string, Promise<void>>()
const IN_FLIGHT_TIMEOUT_MS = 120_000

function parseRangeHeader(rangeHeader: string, totalSize: number): { start: number, end: number } | null {
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/)
  if (!match) return null

  let start = match[1] ? Number.parseInt(match[1], 10) : NaN
  let end = match[2] ? Number.parseInt(match[2], 10) : NaN

  if (Number.isNaN(start) && Number.isNaN(end)) return null

  // Suffix range: bytes=-500 means last 500 bytes
  if (Number.isNaN(start)) {
    start = Math.max(0, totalSize - end)
    end = totalSize - 1
  }
  else if (Number.isNaN(end)) {
    end = totalSize - 1
  }

  if (start > end || start >= totalSize) return null
  end = Math.min(end, totalSize - 1)

  return { start, end }
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
) {
  const file = bucket.file(cacheKey)
  const metadata = await file.getMetadata()
  const totalSize = Number(metadata[0].size)
  const contentType = metadata[0].contentType || contentFormat
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

  // Verify text signature — binds request to user + book + exact text content
  // System voices use an empty-token sig so URLs converge across users and can
  // be shared-cached at Cloudflare. Custom voices keep the per-user token so
  // per-user URLs remain unique, preventing cross-user cache collision on
  // content that is genuinely per-user (each wallet's cloned voice).
  const sigToken = isCustomVoice ? (session.user.ttsKey || session.user.evmWallet) : ''
  if (sig !== computeTTSTextSig(sigToken, nftClassId, text)) {
    throw createError({ status: 403, message: 'INVALID_TTS_SIG' })
  }

  let customMiniMaxVoiceId: string | undefined
  let voiceDisplayName: string | undefined
  let provider: BaseTTSProvider

  if (isCustomVoice) {
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
  console.log(`[Speech] User ${session.user.evmWallet} requested conversion. Language: ${language}, Text: "${logText.substring(0, 50)}${logText.length > 50 ? '...' : ''}", Voice: ${voiceId}${isCustomVoice ? ` (${customMiniMaxVoiceId})` : ''}`)

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
    ? (customVoiceWallet
        ? generateCustomVoiceTTSCacheKey(customVoiceWallet, language, text, ttsModel)
        : generateTTSCacheKey(language, voiceId, text, ttsModel))
    : null

  const ttsEventBase = {
    evmWallet: session.user.evmWallet,
    language,
    voiceId,
    isCustomVoice,
    textLength: text.length,
    nftClassId,
  }

  if (isCacheEnabled) {
    const file = bucket.file(cacheKey!)

    try {
      const [exists] = await file.exists()
      if (exists) {
        publishEvent(event, 'TTSCacheHit', ttsEventBase)
        return await serveCachedTTS(event, bucket, cacheKey!, provider.format, session.user.evmWallet)
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
        return await serveCachedTTS(event, bucket!, cacheKey, provider.format, session.user.evmWallet)
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
