import type { Ref } from 'vue'

interface UseReaderErrorActionsOptions {
  readerType: 'epub' | 'pdf'
  nftClassId: Ref<string>
  nftId: Ref<string | undefined>
  bookName: Ref<string>
  isUploadedBook: Ref<boolean>
}

// Builds the "book failed to open" modal buttons (contact CS / back to shelf).
// The contact button pre-fills the failure details for troubleshooting.
export default function useReaderErrorActions({
  readerType,
  nftClassId,
  nftId,
  bookName,
  isUploadedBook,
}: UseReaderErrorActionsOptions) {
  const { t: $t } = useI18n()
  const localeRoute = useLocaleRoute()
  const { appPlatform, buildVersion } = useAppDetection()
  const { showNewMessageWithVisibility } = useIntercomVisibility()

  function handleContactCustomerService(error: unknown) {
    const { message, statusCode, url } = parseError(error)
    const platform = buildVersion.value
      ? `${appPlatform.value} build ${buildVersion.value}`
      : appPlatform.value

    const prefillMessage = $t('reader_error_contact_cs_prefill', {
      bookName: bookName.value || '-',
      bookId: nftClassId.value || '-',
      nftId: nftId.value || '-',
      format: readerType.toUpperCase(),
      error: message || '-',
      url: url || '-',
      statusCode: statusCode ?? '-',
      platform,
    })
    const subject = $t('reader_error_contact_cs_email_subject', { bookName: bookName.value })

    showNewMessageWithVisibility(prefillMessage, subject)

    useLogEvent('reader_error_contact_cs', {
      nft_class_id: nftClassId.value,
      reader: readerType,
      is_uploaded_book: isUploadedBook.value,
      status_code: statusCode,
    })
  }

  function getBookLoadErrorActions(error: unknown): ErrorHandlerAction[] {
    return [
      {
        label: $t('reader_error_contact_cs_button'),
        icon: 'i-material-symbols-support-agent-rounded',
        color: 'neutral',
        variant: 'outline',
        onClick: () => handleContactCustomerService(error),
      },
      {
        label: $t('reader_error_back_to_shelf_button'),
        icon: 'i-material-symbols-arrow-back-rounded',
        color: 'primary',
        onClick: () => { navigateTo(localeRoute({ name: 'shelf' })) },
      },
    ]
  }

  return { getBookLoadErrorActions }
}
