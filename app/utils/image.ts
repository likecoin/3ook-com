// Decode an object URL via <img> + canvas. When `skipIfSmall` is set and
// the source already fits within `maxSize`, short-circuits with a `skipped`
// flag so the caller can keep the original bytes untouched. Otherwise
// re-encodes to JPEG. The decode step doubles as image validation —
// non-image inputs reject via the `<img>` error event.
function drawAndExport(
  url: string,
  maxSize: number,
  quality: number,
  skipIfSmall: boolean,
): Promise<{ blob: Blob, skipped: boolean }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (skipIfSmall && img.width <= maxSize && img.height <= maxSize) {
        resolve({ blob: new Blob(), skipped: true })
        return
      }
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const width = Math.round(img.width * scale)
      const height = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (out) => {
          if (!out) {
            reject(new Error('Failed to resize image'))
            return
          }
          resolve({ blob: out, skipped: false })
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Invalid image'))
    }
    img.src = url
  })
}

export async function resizeImageFile(
  file: File,
  maxSize: number,
  quality = 0.85,
): Promise<File> {
  const url = URL.createObjectURL(file)
  const { blob, skipped } = await drawAndExport(url, maxSize, quality, true)
  if (skipped) return file
  return new File([blob], file.name, { type: 'image/jpeg' })
}

export async function resizeImageBlob(
  blob: Blob,
  maxSize: number,
  quality = 0.85,
): Promise<Blob> {
  const url = URL.createObjectURL(blob)
  const result = await drawAndExport(url, maxSize, quality, false)
  return result.blob
}
