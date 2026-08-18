# TTS export

Batch-generates MiniMax TTS audio for a whole EPUB, one MP3 per chapter, for
internal evaluation and ad-hoc audiobook export.

```sh
# Dry run — extracts, segments, computes cache keys, spends nothing
node scripts/tts-export/run.mjs --epub ./book.epub --language zh-HK --voice phoebe_v28

# Sample 20 segments against the live API
node scripts/tts-export/run.mjs --epub ./book.epub --language zh-HK --voice phoebe_v28 \
  --limit 20 --execute

# Full run, also pre-warming the production TTS cache
TTS_CACHE_BUCKET_PREFIX=... node scripts/tts-export/run.mjs --epub ./book.epub \
  --language zh-HK --voice phoebe_v28 --nft-class-id 0x... --execute --write-cache
```

`--help` lists every flag. Dry run is the default; nothing reaches MiniMax
without `--execute`.

## Why it imports server code

`run.mjs` shims the Nitro auto-imports (`useRuntimeConfig`, `createError`) onto
`globalThis`, then loads modules through jiti with the repo's `~~`/`~` aliases.
That lets the script import the real `tts-minimax.ts`, `storage.ts` and `id3.ts`
rather than reimplementing them, so voice/model selection, pause markers, the
pronunciation dictionary, the ID3 tag and the cache-key format cannot drift from
production.

`extract.ts` is the one unavoidable port — `extractTTSSegments` lives inside
`app/pages/reader/epub.vue` and depends on the DOM. It is kept line-for-line
comparable with the original; see its header comment for the two deliberate
deviations. **Segment text must match the reader byte for byte**, because
`--write-cache` writes under `sha256(text)` keys that the reader looks up. If
you change segmentation on either side, change it on both.

## Environment

| Variable | Needed for |
|---|---|
| `NUXT_MINIMAX_API_KEY` | `--execute` |
| `NUXT_MINIMAX_GROUP_ID` | `--execute` |
| `TTS_CACHE_BUCKET_PREFIX` | cache keys in the audit, and `--write-cache` |
| `GOOGLE_APPLICATION_CREDENTIALS` | `--write-cache` |

## Output

- `audit.csv` — every segment with its index, length, cache key and text
- `NNN-<chapter title>.mp3` — one file per spine section, written only with `--execute`
