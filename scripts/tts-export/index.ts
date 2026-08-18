import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { sanitizeTTSText } from '../../app/utils/tts'
import type { TTSRequestParams } from '../../server/utils/api-tts'
import { buildID3v2Tag } from '../../server/utils/id3'
import { generateTTSCacheKey, getTTSCacheBucket } from '../../server/utils/storage'
import {
  createTTSPronunciationSigGetter,
  getMinimaxModel,
  getMinimaxVoiceId,
  getVoiceDisplayName,
  LANG_MAPPING,
  MinimaxTTSProvider,
  TTS_PRONUNCIATION_VERSION,
} from '../../server/utils/tts-minimax'
import { extractTTSSegments, type ExportSegment } from './extract'

const LANGUAGES = Object.keys(LANG_MAPPING)

// Enough consecutive failures means the run is broken (bad key, exhausted
// quota, outage), not unlucky — stop instead of grinding through the book.
const CONSECUTIVE_FAILURE_LIMIT = 10

interface PlannedSegment extends ExportSegment {
  index: number
  // What actually reaches MiniMax and the cache key. The reader sanitizes in
  // getAudioSrc before signing the URL and the server hashes what it receives,
  // so hashing raw text here would write keys production never looks up.
  synthesisText: string
  cacheKey: string | undefined
}

function printUsage() {
  console.log(`
Export whole-book TTS audio from an EPUB.

  node scripts/tts-export/run.mjs --epub <path|url> --language <lang> --voice <id> [options]

Required
  --epub <path|url>     EPUB file to export
  --language <lang>     ${LANGUAGES.join(' | ')}
  --voice <id>          Internal voice id (e.g. phoebe_v28, astro, aurora, 0, 1)

Options
  --out <dir>           Output directory (default: ./tts-export-out/<epub name>)
  --chapters <spec>     Section indices, e.g. "3" or "2-7" (default: all)
  --limit <n>           Stop after n segments — use this to sample before a full run
  --concurrency <n>     Parallel synthesis requests (default: 4)
  --nft-class-id <id>   Stamped into cache metadata, matching the reader
  --execute             Actually call MiniMax. Without it this is a dry run.
  --write-cache         Also upload each segment to the production GCS TTS cache

Dry run by default: extracts, segments, computes cache keys and writes the
audit CSV without spending a single MiniMax character. When the cache bucket is
reachable, existing segments are downloaded instead of re-synthesized, so a
re-run after a failure only pays for what is missing.
`)
}

function parsePositiveInt(value: string | undefined, flag: string): number | undefined {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${flag} "${value}", expected a positive integer`)
  }
  return parsed
}

function parseChapterRange(spec: string | undefined): { start: number, end: number } | undefined {
  if (!spec) return undefined
  const match = spec.match(/^(\d+)(?:-(\d+))?$/)
  if (!match) throw new Error(`Invalid --chapters "${spec}", expected "3" or "2-7"`)
  const start = Number(match[1])
  const end = match[2] === undefined ? start : Number(match[2])
  if (end < start) throw new Error(`Invalid --chapters "${spec}", end is before start`)
  return { start, end }
}

/** Base name for output paths, with any query string or fragment dropped. */
function getSourceName(source: string): string {
  const withoutQuery = source.split(/[?#]/)[0] || source
  return basename(withoutQuery).replace(/\.epub$/i, '')
}

async function fetchEpub(source: string): Promise<Buffer> {
  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source)
    if (!response.ok) throw new Error(`Failed to fetch EPUB: ${response.status}`)
    return Buffer.from(await response.arrayBuffer())
  }
  return readFile(resolve(source))
}

/**
 * Drop a leading ID3v2 tag. Cached objects are stored tagged, so a downloaded
 * segment would otherwise splice an ID3 header into the middle of the chapter
 * MP3 it is concatenated into.
 */
function stripID3v2Tag(buffer: Buffer): Buffer {
  if (buffer.length < 10 || buffer.toString('ascii', 0, 3) !== 'ID3') return buffer
  // Size is synchsafe: four 7-bit groups, excluding this 10-byte header.
  const size = ((buffer[6]! & 0x7F) << 21) | ((buffer[7]! & 0x7F) << 14)
    | ((buffer[8]! & 0x7F) << 7) | (buffer[9]! & 0x7F)
  const hasFooter = (buffer[5]! & 0x10) !== 0
  return buffer.subarray(10 + size + (hasFooter ? 10 : 0))
}

function toCSVCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

async function writeAuditCSV(path: string, segments: PlannedSegment[]) {
  const header = 'index,sectionIndex,elementIndex,chars,cacheKey,text\n'
  const rows = segments.map(segment => [
    segment.index,
    segment.sectionIndex,
    segment.elementIndex,
    segment.synthesisText.length,
    toCSVCell(segment.cacheKey ?? ''),
    toCSVCell(segment.synthesisText),
  ].join(','))
  await writeFile(path, header + rows.join('\n') + '\n')
}

/** Bounded worker pool. Preserves input order in the results array. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  handler: (item: T, index: number) => Promise<R>,
): Promise<(R | undefined)[]> {
  const results: (R | undefined)[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await handler(items[index]!, index)
    }
  })
  await Promise.all(workers)
  return results
}

/** A client error other than rate limiting will fail identically on a retry. */
function getIsRetryable(error: unknown): boolean {
  const status = (error as { status?: number, statusCode?: number })?.status
    ?? (error as { statusCode?: number })?.statusCode
  if (typeof status !== 'number') return true
  return status === 429 || status < 400 || status >= 500
}

async function synthesizeWithRetry(
  provider: MinimaxTTSProvider,
  params: TTSRequestParams,
  attempts = 3,
): Promise<Buffer> {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const { audio } = await provider.processRequest(params)
      if (!audio?.length) throw new Error('Empty audio returned')
      return audio
    }
    catch (error) {
      lastError = error
      if (!getIsRetryable(error)) break
      if (attempt < attempts) {
        // Jittered, so a pool that trips a rate limit together does not retry together.
        await new Promise(r => setTimeout(r, 500 * 2 ** (attempt - 1) * (1 + Math.random())))
      }
    }
  }
  throw lastError
}

export async function main(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    strict: true,
    options: {
      'epub': { type: 'string' },
      'language': { type: 'string' },
      'voice': { type: 'string' },
      'out': { type: 'string' },
      'chapters': { type: 'string' },
      'limit': { type: 'string' },
      'concurrency': { type: 'string', default: '4' },
      'nft-class-id': { type: 'string' },
      'execute': { type: 'boolean', default: false },
      'write-cache': { type: 'boolean', default: false },
      'help': { type: 'boolean', default: false },
    },
  })

  if (values.help || !values.epub || !values.language || !values.voice) {
    printUsage()
    if (!values.help) process.exitCode = 1
    return
  }

  const language = values.language
  const voiceId = values.voice
  if (!LANGUAGES.includes(language)) {
    throw new Error(`Invalid --language "${language}", expected ${LANGUAGES.join(' | ')}`)
  }
  const minimaxVoiceId = getMinimaxVoiceId(voiceId)
  if (!minimaxVoiceId) {
    throw new Error(`Unknown --voice "${voiceId}"`)
  }
  if (values['write-cache'] && !values.execute) {
    throw new Error('--write-cache requires --execute')
  }
  const limit = parsePositiveInt(values.limit, '--limit')
  const concurrency = parsePositiveInt(values.concurrency, '--concurrency') ?? 4

  const model = getMinimaxModel({ voiceId, language })
  const sourceName = getSourceName(values.epub)
  const outDir = resolve(values.out || join('tts-export-out', sourceName))
  await mkdir(outDir, { recursive: true })

  console.log(`[export] Reading ${values.epub}`)
  const { segments: allSegments, chapterTitles } = await extractTTSSegments(await fetchEpub(values.epub))

  const range = parseChapterRange(values.chapters)
  let selected = range
    ? allSegments.filter(s => s.sectionIndex >= range.start && s.sectionIndex <= range.end)
    : allSegments
  if (limit) selected = selected.slice(0, limit)

  // A cache key needs the bucket prefix; without it the export still runs and
  // just cannot pre-warm production.
  const hasCachePrefix = !!process.env.TTS_CACHE_BUCKET_PREFIX
  const planned: PlannedSegment[] = selected.flatMap((segment) => {
    const synthesisText = sanitizeTTSText(segment.text)
    // Sanitizing can empty a segment outright (a rule line, a lone asterisk).
    // MiniMax rejects empty text, and there is nothing to hear anyway.
    if (!synthesisText) return []
    return [{
      ...segment,
      synthesisText,
      cacheKey: hasCachePrefix ? generateTTSCacheKey(minimaxVoiceId, language, synthesisText, model) : undefined,
    }]
    // Index after the drop, so audit rows match the run's own numbering.
  }).map((segment, index) => ({ ...segment, index }))

  if (!planned.length) {
    throw new Error('No segments selected — check --chapters against the book\'s section count')
  }

  const totalChars = planned.reduce((sum, s) => sum + s.synthesisText.length, 0)
  const sections = new Set(planned.map(s => s.sectionIndex))
  console.log(`[export] ${planned.length} segments across ${sections.size} sections, ${totalChars} characters`)
  console.log(`[export] voice=${voiceId} (${minimaxVoiceId}) model=${model} language=${language}`)

  const auditPath = join(outDir, 'audit.csv')
  await writeAuditCSV(auditPath, planned)
  console.log(`[export] Audit written to ${auditPath}`)

  if (!values.execute) {
    console.log('[export] Dry run — nothing synthesized. Re-run with --execute to generate audio.')
    return
  }

  const provider = new MinimaxTTSProvider()
  // Reads are worth having whenever the bucket is reachable: they turn a
  // re-run into a resume. Writes stay behind the explicit flag.
  let bucket: ReturnType<typeof getTTSCacheBucket> = null
  try {
    bucket = getTTSCacheBucket()
  }
  catch (error) {
    if (values['write-cache']) throw error
    console.warn('[export] TTS cache unavailable, synthesizing everything:', error)
  }
  if (values['write-cache'] && !bucket) {
    throw new Error('--write-cache needs TTS_CACHE_BUCKET_PREFIX and Firebase credentials')
  }
  const voiceDisplayName = getVoiceDisplayName(voiceId)
  const dictVersion = TTS_PRONUNCIATION_VERSION[language] ?? 'none'

  // One synthesis per distinct text: repeated headers and separators hash to
  // the same cache key, so paying per occurrence would be paying twice.
  const uniqueTexts = [...new Set(planned.map(s => s.synthesisText))]
  const segmentByText = new Map(planned.map(s => [s.synthesisText, s]))

  let done = 0
  let reused = 0
  let consecutiveFailures = 0
  const failures: PlannedSegment[] = []

  const audioByText = await mapWithConcurrency(uniqueTexts, concurrency, async (text) => {
    const segment = segmentByText.get(text)!
    try {
      // Record the skip: failures.csv is the list of what is missing from the
      // audio, and everything queued behind a tripped breaker is missing too.
      if (consecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT) {
        failures.push(segment)
        return undefined
      }

      if (bucket && segment.cacheKey) {
        try {
          const [cached] = await bucket.file(segment.cacheKey).download()
          reused++
          consecutiveFailures = 0
          return stripID3v2Tag(cached)
        }
        catch {
          // A miss is the normal case on a first run; fall through and generate.
        }
      }

      const raw = await synthesizeWithRetry(provider, { text, language, voiceId })

      if (bucket && values['write-cache'] && segment.cacheKey) {
        // Byte-identical to what the endpoint stores: the ID3 tag is part of
        // the cached object, so a tagless upload would serve short audio.
        const tagged = Buffer.concat([
          buildID3v2Tag({ title: '3ook.com TTS', artist: voiceDisplayName, comment: 'Generated by 3ook.com' }),
          raw,
        ])
        await bucket.file(segment.cacheKey).save(tagged, {
          metadata: {
            contentType: provider.format,
            cacheControl: 'public, max-age=604800',
            metadata: {
              language,
              voiceId,
              provider: provider.provider,
              nftClassId: values['nft-class-id'] ?? '',
              text: text.length > 1800 ? text.substring(0, 1800) + '...' : text,
              textLength: text.length.toString(),
              pronunciationVersion: dictVersion,
              pronunciationSig: createTTSPronunciationSigGetter(language, text)(),
              createdAt: new Date().toISOString(),
            },
          },
        })
      }

      done++
      consecutiveFailures = 0
      if (done % 25 === 0) console.log(`[export] ${done}/${uniqueTexts.length} synthesized`)
      return raw
    }
    catch (error) {
      consecutiveFailures++
      failures.push(segment)
      console.warn(`[export] Segment ${segment.index} (${segment.id}) failed:`, error)
      return undefined
    }
  })

  const bufferByText = new Map(uniqueTexts.map((text, index) => [text, audioByText[index]]))
  if (consecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT) {
    console.error(`[export] Stopped after ${CONSECUTIVE_FAILURE_LIMIT} consecutive failures — check credentials, quota and voice id`)
  }

  // One MP3 per section, so a chapter is playable on its own. Segment audio is
  // concatenated raw and given a single leading tag — one tag per segment would
  // litter ID3 headers through the middle of the file.
  const bySection = new Map<number, Buffer[]>()
  for (const segment of planned) {
    const buffer = bufferByText.get(segment.synthesisText)
    if (!buffer) continue
    const list = bySection.get(segment.sectionIndex) ?? []
    list.push(buffer)
    bySection.set(segment.sectionIndex, list)
  }

  for (const [sectionIndex, buffers] of [...bySection.entries()].sort((a, b) => a[0] - b[0])) {
    const title = chapterTitles[sectionIndex] || `Section ${sectionIndex}`
    const tag = buildID3v2Tag({ title, artist: voiceDisplayName, comment: `3ook.com TTS — ${sourceName}` })
    const name = `${String(sectionIndex).padStart(3, '0')}-${title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 60)}.mp3`
    await writeFile(join(outDir, name), Buffer.concat([tag, ...buffers]))
  }

  console.log(`[export] Wrote ${bySection.size} chapter files to ${outDir}`)
  if (reused) console.log(`[export] Reused ${reused} cached segment(s)`)
  if (failures.length) {
    const failurePath = join(outDir, 'failures.csv')
    await writeAuditCSV(failurePath, failures)
    console.warn(`[export] ${failures.length} segment(s) failed and are missing from the audio — see ${failurePath}`)
  }
  if (values['write-cache']) console.log('[export] Segments uploaded to the production TTS cache')
}
