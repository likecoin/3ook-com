import * as v from 'valibot'
import { MAX_HEARTBEAT_DELTA_MS, MAX_SESSION_DURATION_MS } from '~/constants/analytics'
import { nftClassIdField } from '~/server/schemas/params'

export const ReadingSessionSchema = v.object({
  nftClassId: nftClassIdField,
  sessionId: v.pipe(
    v.string('MISSING_SESSION_ID'),
    v.nonEmpty('MISSING_SESSION_ID'),
  ),
  activeReadingTimeMs: v.pipe(
    v.number('INVALID_ACTIVE_READING_TIME'),
    v.minValue(0, 'INVALID_ACTIVE_READING_TIME'),
    v.maxValue(MAX_SESSION_DURATION_MS, 'ACTIVE_READING_TIME_TOO_LARGE'),
  ),
  ttsActiveTimeMs: v.pipe(
    v.number('INVALID_TTS_ACTIVE_TIME'),
    v.minValue(0, 'INVALID_TTS_ACTIVE_TIME'),
    v.maxValue(MAX_SESSION_DURATION_MS, 'TTS_ACTIVE_TIME_TOO_LARGE'),
  ),
  activeReadingTimeMsDelta: v.pipe(
    v.number('INVALID_ACTIVE_READING_TIME_DELTA'),
    v.minValue(0, 'INVALID_ACTIVE_READING_TIME_DELTA'),
    v.maxValue(MAX_SESSION_DURATION_MS, 'ACTIVE_READING_TIME_DELTA_TOO_LARGE'),
  ),
  ttsActiveTimeMsDelta: v.pipe(
    v.number('INVALID_TTS_ACTIVE_TIME_DELTA'),
    v.minValue(0, 'INVALID_TTS_ACTIVE_TIME_DELTA'),
    v.maxValue(MAX_SESSION_DURATION_MS, 'TTS_ACTIVE_TIME_DELTA_TOO_LARGE'),
  ),
  pagesViewed: v.pipe(
    v.number('INVALID_PAGES_VIEWED'),
    v.minValue(0, 'INVALID_PAGES_VIEWED'),
    v.integer('INVALID_PAGES_VIEWED'),
  ),
  startProgress: v.pipe(
    v.number('INVALID_START_PROGRESS'),
    v.minValue(0, 'INVALID_START_PROGRESS'),
    v.maxValue(100, 'INVALID_START_PROGRESS'),
  ),
  endProgress: v.pipe(
    v.number('INVALID_END_PROGRESS'),
    v.minValue(0, 'INVALID_END_PROGRESS'),
    v.maxValue(100, 'INVALID_END_PROGRESS'),
  ),
  readerType: v.picklist(['epub', 'pdf'], 'INVALID_READER_TYPE'),
  chapterIndex: v.optional(v.pipe(
    v.number('INVALID_CHAPTER_INDEX'),
    v.minValue(0, 'INVALID_CHAPTER_INDEX'),
    v.integer('INVALID_CHAPTER_INDEX'),
  )),
  pageIndex: v.optional(v.pipe(
    v.number('INVALID_PAGE_INDEX'),
    v.minValue(0, 'INVALID_PAGE_INDEX'),
    v.integer('INVALID_PAGE_INDEX'),
  )),
})

export const HeartbeatSchema = v.object({
  nftClassId: nftClassIdField,
  sessionId: v.pipe(
    v.string('MISSING_SESSION_ID'),
    v.nonEmpty('MISSING_SESSION_ID'),
  ),
  activeReadingTimeMsDelta: v.pipe(
    v.number('INVALID_ACTIVE_READING_TIME_DELTA'),
    v.minValue(0, 'INVALID_ACTIVE_READING_TIME_DELTA'),
    v.maxValue(MAX_HEARTBEAT_DELTA_MS, 'ACTIVE_READING_TIME_DELTA_TOO_LARGE'),
  ),
  ttsActiveTimeMsDelta: v.pipe(
    v.number('INVALID_TTS_ACTIVE_TIME_DELTA'),
    v.minValue(0, 'INVALID_TTS_ACTIVE_TIME_DELTA'),
    v.maxValue(MAX_HEARTBEAT_DELTA_MS, 'TTS_ACTIVE_TIME_DELTA_TOO_LARGE'),
  ),
})
