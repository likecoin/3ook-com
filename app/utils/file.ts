export async function saveAs(blob: Blob, filename: string): Promise<void> {
  if (isNativeWebView()) {
    const base64 = await readBlobAsBase64(blob)
    postToNative({
      type: 'fileDownloadData',
      filename,
      base64,
    })
    return
  }

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

function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataURL = reader.result
      if (typeof dataURL !== 'string') {
        reject(new Error('FileReader result is not a string'))
        return
      }
      const commaIndex = dataURL.indexOf(',')
      if (commaIndex === -1) {
        reject(new Error('Invalid data URL format'))
        return
      }
      resolve(dataURL.slice(commaIndex + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob as base64'))
    reader.readAsDataURL(blob)
  })
}
