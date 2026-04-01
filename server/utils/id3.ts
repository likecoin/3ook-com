/**
 * Minimal ID3v2.4 tag builder for embedding metadata into MP3 audio.
 * Produces a standalone ID3v2 header buffer that can be prepended to raw MP3 frames.
 */

function encodeTextFrame(frameId: string, text: string): Buffer {
  const textBuf = Buffer.from(text, 'utf-8')
  const payload = Buffer.alloc(1 + textBuf.length)
  payload[0] = 0x03 // UTF-8 encoding
  textBuf.copy(payload, 1)

  const header = Buffer.alloc(10)
  header.write(frameId, 0, 4, 'ascii')
  writeSynchsafe(header, 4, payload.length)
  return Buffer.concat([header, payload])
}

function encodeCommentFrame(text: string, language = 'eng'): Buffer {
  const textBuf = Buffer.from(text, 'utf-8')
  const payload = Buffer.alloc(1 + 3 + 1 + textBuf.length)
  payload[0] = 0x03 // UTF-8 encoding
  payload.write(language.substring(0, 3), 1, 3, 'ascii')
  payload[4] = 0x00 // empty short description (required by COMM frame spec)
  textBuf.copy(payload, 5)

  const header = Buffer.alloc(10)
  header.write('COMM', 0, 4, 'ascii')
  writeSynchsafe(header, 4, payload.length)
  return Buffer.concat([header, payload])
}

function writeSynchsafe(target: Buffer, offset: number, size: number) {
  target[offset] = (size >> 21) & 0x7F
  target[offset + 1] = (size >> 14) & 0x7F
  target[offset + 2] = (size >> 7) & 0x7F
  target[offset + 3] = size & 0x7F
}

export function buildID3v2Tag(fields: {
  title?: string
  artist?: string
  comment?: string
}): Buffer {
  const frames: Buffer[] = []

  if (fields.title) frames.push(encodeTextFrame('TIT2', fields.title))
  if (fields.artist) frames.push(encodeTextFrame('TPE1', fields.artist))
  if (fields.comment) frames.push(encodeCommentFrame(fields.comment))

  const body = Buffer.concat(frames)

  const header = Buffer.alloc(10)
  header.write('ID3', 0, 3, 'ascii')
  header[3] = 0x04 // v2.4
  writeSynchsafe(header, 6, body.length)

  return Buffer.concat([header, body])
}
