/**
 * Slug safe to hand a filesystem or a download prompt: letters and digits are
 * kept, everything else collapses to a single dash.
 *
 * Sliced by code point rather than UTF-16 unit, or a title of astral
 * characters (CJK extension B, emoji) can be cut mid-pair and leave a lone
 * surrogate in the name.
 */
export function getSafeFilenameSlug(
  name: string,
  { maxLength = 60, fallback = 'file' }: { maxLength?: number, fallback?: string } = {},
): string {
  const slug = [...name.replace(/[^\p{L}\p{N}]+/gu, '-')]
    .slice(0, maxLength)
    .join('')
    // After the slice, or a trimmed-then-sliced name can end on a dash again.
    .replace(/^-+|-+$/g, '')
  return slug || fallback
}
