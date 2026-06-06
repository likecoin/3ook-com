import type { Ref } from 'vue'

interface UseReaderFileLoadOptions {
  isReaderLoading: Ref<boolean>
  readerType: 'epub' | 'pdf'
  // The page-specific loader (loadEPub / loadPDF). Kept lazy so it can be
  // re-run from scratch on a foreground retry.
  load: () => Promise<void>
  // Resolved by the page so the literal $t() keys stay greppable.
  getErrorTitle: () => string
  // The page's own useErrorHandler instance, whose modal the page renders.
  handleError: ReturnType<typeof useErrorHandler>['handleError']
  // Aborts the wedged in-flight book fetch so the retry doesn't wait out the
  // stall timeout. From the page's own useBookFileLoader instance.
  abortLoad: () => void
}

export default function useReaderFileLoad({
  isReaderLoading,
  readerType,
  load,
  getErrorTitle,
  handleError,
  abortLoad,
}: UseReaderFileLoadOptions) {
  const localeRoute = useLocaleRoute()

  // Bumped on every attempt so a superseded attempt (e.g. one aborted by a
  // foreground retry) resolves silently instead of flipping loading state or
  // showing an error modal.
  let loadAttempt = 0
  let wasHiddenWhileLoading = false

  async function startReaderLoad() {
    const attempt = ++loadAttempt
    isReaderLoading.value = true
    try {
      await load()
      if (attempt !== loadAttempt) return
      isReaderLoading.value = false
    }
    catch (error) {
      if (attempt !== loadAttempt) return
      await handleError(error, {
        title: getErrorTitle(),
        onClose: () => {
          navigateTo(localeRoute({ name: 'shelf' }))
        },
      })
      // Clear the loading state so a dismissed error modal doesn't strand the
      // reader on the loading bar (and so a later foreground resume, which gates
      // on isReaderLoading, doesn't fire a spurious retry). Guarded so a
      // superseded attempt can't clobber a newer one's state.
      if (attempt === loadAttempt) isReaderLoading.value = false
    }
  }

  // iOS WebKit wedges the in-flight cross-origin book fetch when the app is
  // backgrounded, leaving the reader stuck on the loading bar. On foreground,
  // abort the wedged attempt and retry instead of waiting out the stall timeout.
  const visibility = useDocumentVisibility()
  watch(visibility, (state) => {
    if (state !== 'visible') {
      wasHiddenWhileLoading ||= isReaderLoading.value
      return
    }
    const shouldRetry = wasHiddenWhileLoading && isReaderLoading.value
    wasHiddenWhileLoading = false
    if (!shouldRetry) return
    useLogEvent('book_file_load_retry', { reader: readerType })
    abortLoad()
    startReaderLoad()
  })

  return { startReaderLoad }
}
