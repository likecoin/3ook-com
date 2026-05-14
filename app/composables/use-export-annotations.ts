export default function useExportAnnotations(options: {
  bookId: Ref<string> | ComputedRef<string> | string
  bookName?: Ref<string> | ComputedRef<string> | string
}) {
  const { t: $t } = useI18n()
  const toast = useToast()

  async function exportAnnotations() {
    const bookId = toValue(options.bookId)
    useLogEvent('export_annotations', { nft_class_id: bookId })
    const loadingToast = toast.add({
      title: $t('bookshelf_export_annotations_loading'),
      duration: 0,
    })

    try {
      const data = await $fetch<Record<string, unknown> & { annotations: unknown[] }>(
        `/api/books/${bookId}/annotations/export`,
      )

      if (!data.annotations?.length) {
        toast.add({
          title: $t('bookshelf_export_annotations_empty'),
          duration: 3000,
        })
        return
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/ld+json' })
      const rawName = toValue(options.bookName) || ''
      const filename = rawName.replace(/[<>:"/\\|?*\n\r]+/g, '_').trim() || bookId
      await saveAs(blob, `${filename}-annotations.json`)
      toast.add({
        title: $t('bookshelf_export_annotations_success'),
        duration: 3000,
      })
    }
    catch (error) {
      console.error(`Failed to export annotations for ${bookId}:`, error)
      toast.add({
        title: $t('bookshelf_export_annotations_failed'),
        color: 'error',
      })
    }
    finally {
      toast.remove(loadingToast.id)
    }
  }

  return { exportAnnotations }
}
