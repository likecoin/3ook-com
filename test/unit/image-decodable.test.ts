// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  DECODABLE_IMAGE_ACCEPT,
  DECODABLE_IMAGE_TYPES,
  isDecodableImageFile,
} from '../../app/utils/image'

function fileOfType(type: string): File {
  return new File([new Uint8Array([0])], 'avatar', { type })
}

describe('isDecodableImageFile', () => {
  it('accepts every decodable raster format', () => {
    for (const type of DECODABLE_IMAGE_TYPES) {
      expect(isDecodableImageFile(fileOfType(type))).toBe(true)
    }
  })

  // HEIC/HEIF passes an `image/*` filter but Chrome cannot decode it, which is
  // the format an Android gallery hands back.
  it('rejects HEIC and HEIF', () => {
    expect(isDecodableImageFile(fileOfType('image/heic'))).toBe(false)
    expect(isDecodableImageFile(fileOfType('image/heif'))).toBe(false)
  })

  it('rejects a non-image type and an empty type', () => {
    expect(isDecodableImageFile(fileOfType('application/pdf'))).toBe(false)
    expect(isDecodableImageFile(fileOfType(''))).toBe(false)
  })

  it('keeps the accept hint in sync with the allowlist', () => {
    expect(DECODABLE_IMAGE_ACCEPT).toBe(DECODABLE_IMAGE_TYPES.join(','))
  })
})
