import { describe, expect, it, vi } from 'vitest'
import { withAbortTimeout } from '~~/shared/utils'

describe('withAbortTimeout', () => {
  it('resolves with the callback result and clears the timer', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')
    await expect(withAbortTimeout(1000, async () => 'done')).resolves.toBe('done')
    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })

  it('aborts the signal it hands the callback once the timeout elapses', async () => {
    vi.useFakeTimers()
    try {
      let captured: AbortSignal | undefined
      const pending = withAbortTimeout(1000, signal => new Promise<string>((resolve) => {
        captured = signal
        signal.addEventListener('abort', () => resolve('aborted'), { once: true })
      }))
      await vi.advanceTimersByTimeAsync(1000)
      await expect(pending).resolves.toBe('aborted')
      expect(captured?.aborted).toBe(true)
      expect((captured?.reason as DOMException).name).toBe('TimeoutError')
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('aborts as soon as the caller signal does, carrying its reason', async () => {
    const controller = new AbortController()
    const reason = new DOMException('Cancelled', 'AbortError')
    const pending = withAbortTimeout(1000, signal => new Promise<string>((resolve) => {
      signal.addEventListener('abort', () => resolve(String((signal.reason as Error).name)), { once: true })
    }), controller.signal)
    controller.abort(reason)
    await expect(pending).resolves.toBe('AbortError')
  })

  // Listening after the fact would never fire, so the work would run unbounded
  // by the caller's intent until the timeout saved it.
  it('honours a caller signal that was already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const seen = await withAbortTimeout(1000, async signal => signal.aborted, controller.signal)
    expect(seen).toBe(true)
  })

  // The callback is not required to be async: a synchronous throw must still
  // reach the cleanup rather than escaping before it is attached.
  it('cleans up when the callback throws synchronously', async () => {
    const controller = new AbortController()
    const removeSpy = vi.spyOn(controller.signal, 'removeEventListener')
    await expect(withAbortTimeout(1000, () => {
      throw new Error('sync boom')
    }, controller.signal)).rejects.toThrow('sync boom')
    expect(removeSpy).toHaveBeenCalled()
  })

  it('stops listening to the caller signal once the work settles', async () => {
    const controller = new AbortController()
    const removeSpy = vi.spyOn(controller.signal, 'removeEventListener')
    await withAbortTimeout(1000, async () => 'done', controller.signal)
    expect(removeSpy).toHaveBeenCalled()
  })
})
