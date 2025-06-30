export function useBookDownload() {
  const { loadFileAsBuffer } = useBookFileLoader()
  const { handleError } = useErrorHandler()
  const toast = useToast()
  const { t: $t } = useI18n()

  const mimeTypeMap: Record<string, string> = {
    pdf: 'application/pdf',
    epub: 'application/epub+zip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    txt: 'text/plain',
    json: 'application/json',
    zip: 'application/zip',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
  }

  const getMimeType = (ext: string): string =>
    mimeTypeMap[ext.toLowerCase()] || 'application/octet-stream'

  const saveAs = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadBookFile = async ({
    nftClassId,
    nftId,
    fileIndex = 0,
    isCustomMessageEnabled,
    filename,
    type,
  }: {
    nftClassId: string
    nftId?: string
    fileIndex?: number
    isCustomMessageEnabled: boolean
    filename: string
    type: string
  }): Promise<void> => {
    const downloadingToast = toast.add({
      title: $t('bookshelf_file_downloading', { filename }),
      icon: 'i-heroicons-arrow-down-tray',
      duration: 0,
      close: false,
    })

    try {
      const bookFileURL = getBookFileURLWithCORS({
        nftClassId,
        nftId,
        fileIndex,
        isCustomMessageEnabled,
      })
      const buffer = await loadFileAsBuffer(bookFileURL)
      if (!buffer) {
        throw createError({
          statusCode: 400,
          message: $t('error_download_book_failed'),
        })
      }

      const blob = new Blob([buffer], { type: getMimeType(type) })
      saveAs(blob, filename)

      toast.add({
        title: $t('bookshelf_file_downloaded', { filename }),
        icon: 'i-heroicons-check',
        duration: 3000,
        color: 'success',
      })
    }
    catch (error) {
      handleError(error, { logPrefix: 'book_download' })
    }
    finally {
      toast.remove(downloadingToast.id)
    }
  }

  return { saveAs, getMimeType, downloadBookFile }
}
