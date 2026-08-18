import { describe, expect, it } from 'vitest'
import { buildID3v2Tag, stripID3v2Tag } from '~~/shared/utils/id3'

const textDecoder = new TextDecoder()

describe('buildID3v2Tag', () => {
  it('writes an ID3v2.4 header whose synchsafe size covers the frames', () => {
    const tag = buildID3v2Tag({ title: 'Chapter One' })
    expect(textDecoder.decode(tag.subarray(0, 3))).toBe('ID3')
    expect(tag[3]).toBe(0x04)
    const size = ((tag[6]! & 0x7F) << 21) | ((tag[7]! & 0x7F) << 14)
      | ((tag[8]! & 0x7F) << 7) | (tag[9]! & 0x7F)
    expect(size).toBe(tag.length - 10)
  })

  // The size field is 7 bits per byte, so a frame over 127 bytes is where a
  // plain 8-bit write would silently produce an unreadable tag.
  it('keeps every synchsafe size byte under 0x80 for a long title', () => {
    const tag = buildID3v2Tag({ title: 'a'.repeat(500) })
    for (const byte of tag.subarray(6, 10)) {
      expect(byte).toBeLessThan(0x80)
    }
  })

  it('omits frames for absent fields', () => {
    expect(buildID3v2Tag({}).length).toBe(10)
    expect(buildID3v2Tag({ title: 'x' }).length).toBeLessThan(
      buildID3v2Tag({ title: 'x', artist: 'y', comment: 'z' }).length,
    )
  })

  it('round-trips non-ASCII through the UTF-8 frame encoding', () => {
    const tag = buildID3v2Tag({ title: '粵語朗讀' })
    expect(textDecoder.decode(tag)).toContain('粵語朗讀')
  })
})

describe('stripID3v2Tag', () => {
  it('removes a tag the builder produced, leaving the frames untouched', () => {
    const frames = new Uint8Array([0xFF, 0xFB, 0x90, 0x00])
    const tag = buildID3v2Tag({ title: 'Chapter One', artist: 'Pazu' })
    const tagged = new Uint8Array(tag.length + frames.length)
    tagged.set(tag)
    tagged.set(frames, tag.length)
    expect([...stripID3v2Tag(tagged)]).toEqual([...frames])
  })

  // A long title pushes the declared size past 127, exercising the multi-byte
  // synchsafe groups in the parser rather than just the low one.
  it('removes a tag whose declared size spans multiple synchsafe groups', () => {
    const frames = new Uint8Array([0xFF, 0xFB, 0x90, 0x00])
    const tag = buildID3v2Tag({ title: 'a'.repeat(500) })
    expect(tag.length).toBeGreaterThan(127 + 10)
    const tagged = new Uint8Array(tag.length + frames.length)
    tagged.set(tag)
    tagged.set(frames, tag.length)
    expect([...stripID3v2Tag(tagged)]).toEqual([...frames])
  })

  // A truncated read declaring more than it holds must stay whole: subarray
  // would clamp to empty, which downstream counts as present-but-silent.
  it('returns the input when the declared size runs past the end', () => {
    const audio = new Uint8Array(20)
    audio.set([0x49, 0x44, 0x33, 0x04, 0x00])
    audio[9] = 100 // declares 100 bytes of tag in a 20-byte buffer
    expect(stripID3v2Tag(audio).length).toBe(20)
  })

  it('leaves untagged audio alone', () => {
    const frames = new Uint8Array([0xFF, 0xFB, 0x90, 0x00])
    expect([...stripID3v2Tag(frames)]).toEqual([...frames])
  })

  it('skips the footer when the header flags one', () => {
    const audio = new Uint8Array(30)
    audio.set([0x49, 0x44, 0x33, 0x04, 0x00])
    audio[5] = 0x10 // footer present
    audio[9] = 5 // synchsafe size of 5
    audio[25] = 0xFF
    // 10 header + 5 body + 10 footer = 25 skipped.
    expect(stripID3v2Tag(audio).length).toBe(5)
    expect(stripID3v2Tag(audio)[0]).toBe(0xFF)
  })

  // A truncated read must not be mistaken for a tag and have bytes cut off it.
  it('leaves a buffer too short to hold a header alone', () => {
    const audio = new Uint8Array([0x49, 0x44, 0x33])
    expect([...stripID3v2Tag(audio)]).toEqual([0x49, 0x44, 0x33])
  })
})
