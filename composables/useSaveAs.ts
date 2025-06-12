export function useSaveAs() {
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

  const getMimeType = (ext: string): string => {
    return mimeTypeMap[ext.toLowerCase()] || 'application/octet-stream'
  }

  const saveAs = (blob: Blob, filename: string) => {
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

  return { saveAs, getMimeType }
}
