// The app hides the store, so point to the website as plain text, not a link,
// to stay clear of App Store guideline 3.1.1.
export function useStoreBookAppNotice() {
  const { t: $t } = useI18n()
  const baseModal = useBaseModal()

  return function openStoreBookAppNotice() {
    baseModal.open({
      title: $t('library_store_book_app_notice_title'),
      description: $t('library_store_book_app_notice_description'),
    })
  }
}
