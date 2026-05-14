export function useContentTypeLabel() {
  const { t: $t } = useI18n()

  return function getContentTypeLabel(type: string) {
    switch (type) {
      case 'epub':
        return $t('bookshelf_open_in_epub')
      case 'pdf':
        return $t('bookshelf_open_in_pdf')
      default:
        return $t('bookshelf_open_in_type', { type })
    }
  }
}
