import { describe, expect, it, vi } from 'vitest'
import { createImpressionBuffer } from '~/utils/grid-impressions'

interface TestContext {
  tag: string
}

function createBuffer(batchSize = 3) {
  const onFlush = vi.fn()
  const buffer = createImpressionBuffer<TestContext>({
    batchSize,
    getContextKey: context => context.tag,
    onFlush,
  })
  return { buffer, onFlush }
}

describe('createImpressionBuffer', () => {
  it('flushes once the batch fills, and not before', () => {
    const { buffer, onFlush } = createBuffer()
    buffer.add('0xAAA', { tag: 'latest' })
    buffer.add('0xBBB', { tag: 'latest' })
    expect(onFlush).not.toHaveBeenCalled()

    buffer.add('0xCCC', { tag: 'latest' })
    expect(onFlush).toHaveBeenCalledTimes(1)
    expect(onFlush).toHaveBeenCalledWith({
      // Normalized, because the click side is: the join is an exact string match.
      nftClassIds: ['0xaaa', '0xbbb', '0xccc'],
      context: { tag: 'latest' },
      batchIndex: 0,
    })
  })

  // The grid remounts its items on a tag switch, so a book seen before can be
  // announced again — which is what would inflate the denominator.
  it('reports a book once per list, however often it is announced', () => {
    const { buffer, onFlush } = createBuffer()
    buffer.add('0xaaa', { tag: 'latest' })
    buffer.add('0xaaa', { tag: 'latest' })
    buffer.add('0xaaa', { tag: 'latest' })
    buffer.flush()

    expect(onFlush).toHaveBeenCalledTimes(1)
    expect(onFlush.mock.calls[0]![0].nftClassIds).toEqual(['0xaaa'])
  })

  it('keeps a partial batch until it is flushed explicitly', () => {
    const { buffer, onFlush } = createBuffer()
    buffer.add('0xaaa', { tag: 'latest' })
    buffer.flush()
    expect(onFlush).toHaveBeenCalledTimes(1)

    // Nothing pending: a second flush must not send an empty impression.
    buffer.flush()
    expect(onFlush).toHaveBeenCalledTimes(1)
  })

  it('sends a pending batch under the context it was collected in', () => {
    const { buffer, onFlush } = createBuffer()
    buffer.add('0xaaa', { tag: 'latest' })
    buffer.add('0xbbb', { tag: 'free' })

    expect(onFlush).toHaveBeenCalledTimes(1)
    expect(onFlush).toHaveBeenCalledWith({
      nftClassIds: ['0xaaa'],
      context: { tag: 'latest' },
      batchIndex: 0,
    })
  })

  it('counts batches per context, so scroll depth is readable per list', () => {
    const { buffer, onFlush } = createBuffer(1)
    buffer.add('0xaaa', { tag: 'latest' })
    buffer.add('0xbbb', { tag: 'latest' })
    buffer.add('0xccc', { tag: 'free' })

    expect(onFlush.mock.calls.map(([payload]) => payload.batchIndex)).toEqual([0, 1, 0])
  })

  // The same book in two lists is two impressions; the same book twice in one
  // list is one.
  it('scopes deduplication to the context', () => {
    const { buffer, onFlush } = createBuffer(1)
    buffer.add('0xaaa', { tag: 'latest' })
    buffer.add('0xaaa', { tag: 'free' })

    expect(onFlush.mock.calls.map(([payload]) => payload.context.tag)).toEqual(['latest', 'free'])
  })

  it('drops ids that normalize away', () => {
    const { buffer, onFlush } = createBuffer(1)
    buffer.add('', { tag: 'latest' })
    expect(onFlush).not.toHaveBeenCalled()
  })

  it('reset clears reported ids so a new reader starts with full reach', () => {
    const { buffer, onFlush } = createBuffer(1)
    buffer.add('0xaaa', { tag: 'latest' })
    buffer.reset()
    buffer.add('0xaaa', { tag: 'latest' })

    expect(onFlush).toHaveBeenCalledTimes(2)
  })
})
