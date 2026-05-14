function convertFloat32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]!))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }
  return int16
}

async function encodeMp3(audioBuffer: AudioBuffer): Promise<Blob> {
  const { Mp3Encoder } = await import('@breezystack/lamejs')
  const channels = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const kbps = 128
  const encoder = new Mp3Encoder(channels, sampleRate, kbps)

  const left = convertFloat32ToInt16(audioBuffer.getChannelData(0))
  const right = channels > 1
    ? convertFloat32ToInt16(audioBuffer.getChannelData(1))
    : left

  const blockSize = 1152
  const mp3Chunks: Uint8Array[] = []

  for (let i = 0; i < left.length; i += blockSize) {
    const leftBlock = left.subarray(i, i + blockSize)
    const rightBlock = right.subarray(i, i + blockSize)
    const buf = channels > 1
      ? encoder.encodeBuffer(leftBlock, rightBlock)
      : encoder.encodeBuffer(leftBlock)
    if (buf.length > 0) mp3Chunks.push(buf)
  }

  const end = encoder.flush()
  if (end.length > 0) mp3Chunks.push(end)

  return new Blob(mp3Chunks, { type: 'audio/mpeg' })
}

export async function convertBlobToMp3(blob: Blob): Promise<Blob> {
  const audioCtx = new AudioContext()
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    return encodeMp3(audioBuffer)
  }
  finally {
    await audioCtx.close()
  }
}
