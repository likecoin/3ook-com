/**
 * Minimal ID3v2.4 tag builder and stripper for MP3 audio. Uint8Array rather
 * than Buffer so the browser can assemble a chapter from cached segments;
 * Buffer extends Uint8Array, so the server and script call sites are unchanged.
 */

const textEncoder = new TextEncoder()

function writeASCII(target: Uint8Array, offset: number, text: string) {
  for (let index = 0; index < text.length; index += 1) {
    target[offset + index] = text.charCodeAt(index)
  }
}

function writeSynchsafe(target: Uint8Array, offset: number, size: number) {
  target[offset] = (size >> 21) & 0x7F
  target[offset + 1] = (size >> 14) & 0x7F
  target[offset + 2] = (size >> 7) & 0x7F
  target[offset + 3] = size & 0x7F
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function encodeTextFrame(frameId: string, text: string): Uint8Array {
  const textBytes = textEncoder.encode(text)
  const payload = new Uint8Array(1 + textBytes.length)
  payload[0] = 0x03 // UTF-8 encoding
  payload.set(textBytes, 1)

  const header = new Uint8Array(10)
  writeASCII(header, 0, frameId)
  writeSynchsafe(header, 4, payload.length)
  return concatBytes([header, payload])
}

function encodeCommentFrame(text: string, language = 'eng'): Uint8Array {
  const textBytes = textEncoder.encode(text)
  const payload = new Uint8Array(1 + 3 + 1 + textBytes.length)
  payload[0] = 0x03 // UTF-8 encoding
  writeASCII(payload, 1, language.substring(0, 3))
  payload[4] = 0x00 // empty short description (required by COMM frame spec)
  payload.set(textBytes, 5)

  const header = new Uint8Array(10)
  writeASCII(header, 0, 'COMM')
  writeSynchsafe(header, 4, payload.length)
  return concatBytes([header, payload])
}

export function buildID3v2Tag(fields: {
  title?: string
  artist?: string
  comment?: string
}): Uint8Array {
  const frames: Uint8Array[] = []

  if (fields.title) frames.push(encodeTextFrame('TIT2', fields.title))
  if (fields.artist) frames.push(encodeTextFrame('TPE1', fields.artist))
  if (fields.comment) frames.push(encodeCommentFrame(fields.comment))

  const body = concatBytes(frames)

  const header = new Uint8Array(10)
  writeASCII(header, 0, 'ID3')
  header[3] = 0x04 // v2.4
  writeSynchsafe(header, 6, body.length)

  return concatBytes([header, body])
}

/**
 * Drop a leading ID3v2 tag. Segments are cached tagged, so concatenating them
 * raw would splice ID3 headers through the middle of the chapter MP3.
 */
export function stripID3v2Tag(audio: Uint8Array): Uint8Array {
  const hasTag = audio.length >= 10
    && audio[0] === 0x49 && audio[1] === 0x44 && audio[2] === 0x33 // 'ID3'
  if (!hasTag) return audio
  // Size is synchsafe: four 7-bit groups, excluding this 10-byte header.
  const size = ((audio[6]! & 0x7F) << 21) | ((audio[7]! & 0x7F) << 14)
    | ((audio[8]! & 0x7F) << 7) | (audio[9]! & 0x7F)
  const hasFooter = (audio[5]! & 0x10) !== 0
  return audio.subarray(10 + size + (hasFooter ? 10 : 0))
}
