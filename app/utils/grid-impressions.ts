import { normalizeNFTClassId } from '~~/shared/utils'

// Batches the ids a browse grid actually put on screen into one impression per
// batch. Per-item events would multiply the grid's event volume by its page
// size; a single list-level event cannot work here, because an infinite-scroll
// list has no final id set to report.
export interface ImpressionFlushPayload<Context> {
  nftClassIds: string[]
  context: Context
  batchIndex: number
}

export interface ImpressionBufferOptions<Context> {
  batchSize: number
  // Derived from the context rather than passed beside it, so the label a batch
  // is reported under and the scope it is deduped by cannot drift apart.
  getContextKey: (context: Context) => string
  onFlush: (payload: ImpressionFlushPayload<Context>) => void
}

export function createImpressionBuffer<Context>({
  batchSize,
  getContextKey,
  onFlush,
}: ImpressionBufferOptions<Context>) {
  // Scoped by context, not bare ids. A cover announces itself once per mount,
  // but the grid remounts its items on every tag switch, so returning to a list
  // already seen would otherwise bill its books again — tab ping-pong is not
  // new reach.
  const reportedKeys = new Set<string>()
  const batchIndexByContextKey = new Map<string, number>()
  let pending: { nftClassIds: string[], context: Context, contextKey: string } | undefined

  function flush() {
    if (!pending) return
    const { nftClassIds, context, contextKey } = pending
    const batchIndex = batchIndexByContextKey.get(contextKey) ?? 0
    batchIndexByContextKey.set(contextKey, batchIndex + 1)
    pending = undefined
    onFlush({ nftClassIds, context, batchIndex })
  }

  function add(nftClassId: string, context: Context) {
    const normalizedNFTClassId = normalizeNFTClassId(nftClassId)
    if (!normalizedNFTClassId) return
    const contextKey = getContextKey(context)
    // A new list is a new denominator: send the pending batch under the context
    // it was collected in, before the changed one can mislabel it.
    if (pending && pending.contextKey !== contextKey) flush()
    const reportedKey = `${contextKey}:${normalizedNFTClassId}`
    if (reportedKeys.has(reportedKey)) return
    reportedKeys.add(reportedKey)
    pending ??= { nftClassIds: [], context, contextKey }
    pending.nftClassIds.push(normalizedNFTClassId)
    if (pending.nftClassIds.length >= batchSize) flush()
  }

  // For an account switch, where the previous reader's reach must not carry over.
  function reset() {
    reportedKeys.clear()
    batchIndexByContextKey.clear()
    pending = undefined
  }

  return { add, flush, reset }
}
