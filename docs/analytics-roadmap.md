# Analytics Roadmap

## Implemented (Data Collection Layer)

### Client-Side
- `composables/use-reading-session.ts` — Core session tracker with idle detection, TTS time tracking, heartbeat, and flush strategies
- `composables/use-tts-playing-state.ts` — Shared global TTS playing state
- Integration in `pages/reader/epub.vue` and `pages/reader/pdf.vue`
- Per-book TTS character tracking via `nft_class_id` param on TTS endpoint
- Client-side events: `reading_session_end`

### Server-Side
- `POST /api/analytics/session` — Full session flush with Firestore writes and PubSub events
- `POST /api/analytics/heartbeat` — Lightweight periodic time increment
- Firestore helpers: `incrementBookReadingTime()` (full session + heartbeat delta), `updateReadingStreak()`, `markBookCompleted()`, `incrementBookTTSCharacterUsage()`
- PubSub events: `3ook_ReadingSession`, `3ook_BookCompleted` (published when `endProgress >= 95%`)

### Firestore Schema Additions
- **`book-users/{wallet}`:** `totalReadingTimeMs`, `totalTTSListeningTimeMs`, `totalBooksCompleted`, `readingStreak { currentDays, longestDays, lastActiveDate }`
- **`book-users/{wallet}/books/{nftClassId}`:** `totalReadingTimeMs`, `totalTTSListeningTimeMs`, `ttsCharactersUsed`, `completedAt`, `sessionCount`

---

## Planned: Reader Statistics Page

**Page:** `/pages/account/stats.vue`

Content:
- Summary cards: total reading time, books completed, current streak, TTS usage
- Top books by reading time (list with progress bars)
- Category and author breakdowns
- Per-book detail view

**API:** `GET /api/analytics/reader-stats` — reads from Firestore user/book docs, joins with book metadata

**Composables:** `use-reader-stats.ts`, `use-reading-streak.ts`

Link from `/pages/account/index.vue`.

---

## Planned: Reading Trends

**API:** `GET /api/analytics/reader-stats/trends?period=daily|weekly|monthly&range=30d|90d|1y`

Queries Elasticsearch `ReadingSession` events aggregated by time bucket. Returns `{ date, readingTimeMs, sessionsCount, booksRead }[]`.

UI: Activity chart on stats page (chart library TBD).

---

## Planned: Publisher Dashboard (nft-book-press)

3ook.com exposes API endpoints, publisher portal consumes them.

### 3ook.com APIs
- `GET /api/analytics/publisher/book/[nftClassId]` — per-book: uniqueReaders, completionRate, avgProgress, progressDistribution, ttsUsageRatio
- `GET /api/analytics/publisher/overview` — all books for authenticated publisher

### Aggregation
Cloud Function consumes `ReadingSession`/`BookCompleted` events → updates `book-analytics/{nftClassId}` Firestore docs.

### nft-book-press Pages
- `/pages/reading-analytics/index.vue` — overview across all books
- `/pages/reading-analytics/[classId].vue` — per-book engagement detail

Privacy: aggregates only, no individual reader identities, minimum 5 readers threshold.

---

## Planned: Reports (Cronjob-Based)

Pre-computed by scheduled Cloud Functions, not on-demand.

| Report | Schedule | Data Source |
|---|---|---|
| Daily | Every day 00:05 UTC | ES: yesterday's ReadingSession events |
| Weekly | Every Monday 01:00 UTC | ES: last 7 days aggregated |
| Monthly | 1st of month 02:00 UTC | ES: last month aggregated |
| Annual | Jan 1st 03:00 UTC | ES: full year aggregated |

Storage: `reports/{period}/{date}` Firestore collections with per-user sub-docs.

### Per-User Report Fields
`readingTimeMs`, `ttsTimeMs`, `booksRead`, `booksCompleted`, `pagesViewed`, `sessionsCount`, `topBooks[]`, `topCategories[]`, `topAuthors[]`, `streakDays`

### Annual Report Extras
`equivalentBookStackCm`, `wordsReadEstimate`, `hoursEquivalent`, `readingTimePeakHour`, `totalReadingDays`, `avgDailyReadingTimeMs`

### Serving APIs
- `GET /api/analytics/report/reader?period=daily|weekly|monthly|annual&date=YYYY-MM-DD`
- `GET /api/analytics/report/author?period=...&date=...`
- `GET /api/analytics/platform?period=...&date=...` (public)

Shareable annual report page: `/pages/account/annual-report/[year].vue`

---

## Planned: Recommendation Foundation

Data from reading sessions naturally builds:
- Category affinity scores from reading time distribution across genres
- Author preference from completed books / reading time
- Collaborative filtering from similar reading patterns in Elasticsearch

No application code needed beyond data collection. Future `GET /api/recommendations` would query a pre-computed model.

---

## Open Questions

1. **Cross-origin auth (Publisher Dashboard):** How should the publisher portal authenticate with 3ook.com's publisher analytics API?
2. **Book completion threshold:** Is 95% progress the right threshold for "completed"? Some books have front/back matter.
3. **Report timezone:** Should daily/weekly/monthly reports use UTC or user's local timezone for day boundaries?
