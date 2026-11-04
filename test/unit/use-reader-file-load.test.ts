import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'

import useReaderFileLoad from '~/composables/use-reader-file-load'

mockNuxtImport('useI18n', () => () => ({ t: (key: string) => key }))

function setup({ load, recoverLoadError }: {
  load: () => Promise<void>
  recoverLoadError: (error: unknown) => Promise<boolean>
}) {
  const isReaderLoading = ref(true)
  const handleError = vi.fn()
  const { startReaderLoad } = useReaderFileLoad({
    isReaderLoading,
    readerType: 'epub',
    load,
    getErrorTitle: () => 'title',
    handleError,
    recoverLoadError,
    abortLoad: vi.fn(),
  })
  return { isReaderLoading, handleError, startReaderLoad }
}

const notOwnerError = createError({ statusCode: 403, message: 'NOT_NFT_OWNER' })

describe('useReaderFileLoad recovery', () => {
  it('retries the load once the error is recovered', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(notOwnerError)
      .mockResolvedValueOnce(undefined)
    const recoverLoadError = vi.fn().mockResolvedValue(true)
    const { isReaderLoading, handleError, startReaderLoad } = setup({ load, recoverLoadError })

    await startReaderLoad()
    await vi.waitFor(() => expect(isReaderLoading.value).toBe(false))

    expect(load).toHaveBeenCalledTimes(2)
    expect(recoverLoadError).toHaveBeenCalledWith(notOwnerError)
    expect(handleError).not.toHaveBeenCalled()
  })

  it('shows the error when the retried load fails too', async () => {
    const load = vi.fn().mockRejectedValue(notOwnerError)
    const recoverLoadError = vi.fn().mockResolvedValue(true)
    const { isReaderLoading, handleError, startReaderLoad } = setup({ load, recoverLoadError })

    await startReaderLoad()
    await vi.waitFor(() => expect(isReaderLoading.value).toBe(false))

    expect(load).toHaveBeenCalledTimes(2)
    expect(recoverLoadError).toHaveBeenCalledTimes(1)
    expect(handleError).toHaveBeenCalledTimes(1)
  })

  it('shows the error without retrying when it cannot be recovered', async () => {
    const load = vi.fn().mockRejectedValue(notOwnerError)
    const recoverLoadError = vi.fn().mockResolvedValue(false)
    const { handleError, startReaderLoad } = setup({ load, recoverLoadError })

    await startReaderLoad()

    expect(load).toHaveBeenCalledTimes(1)
    expect(handleError).toHaveBeenCalledTimes(1)
  })
})
